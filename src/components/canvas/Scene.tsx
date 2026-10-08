/**
 * @fileoverview Scene component - High-performance scroll-driven avatar animation using HTML5 Canvas.
 * Optimized progressive frame loading with nearest-neighbor fallback, zero DOM forced-reflows,
 * bounded memory usage, and smooth 60fps rendering without jitter or tab reloads.
 * @author Ayush Bajaj
 */

import React, { useCallback, useEffect, useRef } from 'react';
import { useStore } from '../../store/useStore';

/**
 * Total number of avatar animation frames.
 */
const FRAME_COUNT = 300;
const LOW_RES_ANCHOR_KEYFRAMES = [...Array.from({ length: 75 }, (_, index) => index * 4), 299];
const LOW_RES_ANCHOR_SET = new Set(LOW_RES_ANCHOR_KEYFRAMES);
const MAX_LOW_RES_CACHE = 92;
const MAX_HIGH_RES_CACHE = 3;

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const lerp = (start: number, end: number, amount: number) => start + (end - start) * amount;

type AvatarPose = {
  frameProgress: number;
  opacity: number;
  scale: number;
  x: number;
  y: number;
};

type ViewportTier = 'mobile' | 'tablet' | 'desktop';

const getViewportTier = (viewportWidth: number): ViewportTier => {
  if (viewportWidth < 768) return 'mobile';
  if (viewportWidth < 1280) return 'tablet';
  return 'desktop';
};

interface TimelineMilestone {
  progress: number;
  frame: number;
  desktop: { x: number; y: number; scale: number; opacity: number };
  tablet: { x: number; y: number; scale: number; opacity: number };
  mobile: { x: number; y: number; scale: number; opacity: number };
}

/**
 * Curated expression & spatial placement choreography.
 * Maps exact page scroll progress to the avatar's most expressive and contextual frames,
 * aligning the character on the right stage adjacent to the left editorial lane.
 *
 * Dedicated timing & poses for Bento Grid vs. Cinematic Flow:
 * - Bento Grid: Taller page (~8,500px), projects take 12%-66% of vertical scroll.
 * - Cinematic: Shorter page (~4,800px), projects take 18%-42% of vertical scroll + interactive horizontal gliding.
 */
const BENTO_SCROLL_MILESTONES: readonly TimelineMilestone[] = [
  {
    progress: 0.00,
    frame: 0, // Intro rest / eyes closed
    desktop: { x: 26, y: 0, scale: 0.90, opacity: 1 },
    tablet:  { x: 18, y: 0, scale: 0.82, opacity: 1 },
    mobile:  { x: 0,  y: 0, scale: 0.86, opacity: 0.22 },
  },
  {
    progress: 0.04,
    frame: 35, // Head lifts smoothly, opening eyes
    desktop: { x: 26, y: 0, scale: 0.90, opacity: 1 },
    tablet:  { x: 18, y: 0, scale: 0.82, opacity: 1 },
    mobile:  { x: 0,  y: 0, scale: 0.86, opacity: 0.22 },
  },
  {
    progress: 0.08,
    frame: 68, // Warm charismatic greeting smile centered at Hero tagline
    desktop: { x: 26, y: 0, scale: 0.90, opacity: 1 },
    tablet:  { x: 18, y: 0, scale: 0.82, opacity: 1 },
    mobile:  { x: 0,  y: 0, scale: 0.86, opacity: 0.20 },
  },
  {
    progress: 0.12,
    frame: 88, // Transitions smoothly out of Hero, head begins turning left
    desktop: { x: 26, y: 0, scale: 0.90, opacity: 1 },
    tablet:  { x: 18, y: 0, scale: 0.82, opacity: 1 },
    mobile:  { x: 1,  y: 0, scale: 0.85, opacity: 0.14 },
  },
  {
    progress: 0.17,
    frame: 94, // Confident smirk, turning head towards Featured Hero Project (MDT)
    desktop: { x: 26, y: 0, scale: 0.90, opacity: 1 },
    tablet:  { x: 18, y: 0, scale: 0.82, opacity: 1 },
    mobile:  { x: 2,  y: 0, scale: 0.84, opacity: 0.10 },
  },
  {
    progress: 0.28,
    frame: 118, // Scanning AST simulator & Cat-X telemetry
    desktop: { x: 26, y: 0, scale: 0.90, opacity: 1 },
    tablet:  { x: 18, y: 0, scale: 0.82, opacity: 1 },
    mobile:  { x: 2,  y: 0, scale: 0.84, opacity: 0.10 },
  },
  {
    progress: 0.40,
    frame: 136, // Scanning Traders ERP engine & 3D architecture viewport
    desktop: { x: 26, y: 0, scale: 0.90, opacity: 1 },
    tablet:  { x: 18, y: 0, scale: 0.82, opacity: 1 },
    mobile:  { x: 2,  y: 0, scale: 0.84, opacity: 0.10 },
  },
  {
    progress: 0.51,
    frame: 154, // Thoughtful scan across remaining projects, easing toward profile
    desktop: { x: 26, y: 0, scale: 0.90, opacity: 1 },
    tablet:  { x: 18, y: 0, scale: 0.82, opacity: 1 },
    mobile:  { x: 2,  y: 0, scale: 0.84, opacity: 0.10 },
  },
  {
    progress: 0.56,
    frame: 172, // Enters About section: head smoothly swivels to direct left orientation
    desktop: { x: 26, y: 0, scale: 0.90, opacity: 1 },
    tablet:  { x: 18, y: 0, scale: 0.82, opacity: 1 },
    mobile:  { x: 2,  y: 0, scale: 0.84, opacity: 0.12 },
  },
  {
    progress: 0.63,
    frame: 195, // PEAK DIRECT EYE CONTACT TO LEFT at About bio & principles cards!
    desktop: { x: 26, y: 0, scale: 0.90, opacity: 1 },
    tablet:  { x: 18, y: 0, scale: 0.82, opacity: 1 },
    mobile:  { x: 2,  y: 0, scale: 0.84, opacity: 0.12 },
  },
  {
    progress: 0.70,
    frame: 212, // Grounded focus finishing About principles
    desktop: { x: 26, y: 0, scale: 0.90, opacity: 1 },
    tablet:  { x: 18, y: 0, scale: 0.82, opacity: 1 },
    mobile:  { x: 2,  y: 0, scale: 0.84, opacity: 0.12 },
  },
  {
    progress: 0.73,
    frame: 224, // Enters Skills: sharp technical focus looking across distributed systems & AI pills
    desktop: { x: 26, y: 0, scale: 0.90, opacity: 1 },
    tablet:  { x: 18, y: 0, scale: 0.82, opacity: 1 },
    mobile:  { x: 2,  y: 0, scale: 0.84, opacity: 0.10 },
  },
  {
    progress: 0.82,
    frame: 236, // Analytical focus across full stack, 3D, and DevOps skill matrices
    desktop: { x: 26, y: 0, scale: 0.90, opacity: 1 },
    tablet:  { x: 18, y: 0, scale: 0.82, opacity: 1 },
    mobile:  { x: 2,  y: 0, scale: 0.84, opacity: 0.10 },
  },
  {
    progress: 0.89,
    frame: 254, // Smoothly easing out of analytical focus, turning back towards center
    desktop: { x: 25, y: 0, scale: 0.90, opacity: 1 },
    tablet:  { x: 17, y: 0, scale: 0.82, opacity: 1 },
    mobile:  { x: 2,  y: 0, scale: 0.85, opacity: 0.10 },
  },
  {
    progress: 0.94,
    frame: 268, // Enters Contact: head returning toward center, warm welcoming posture
    desktop: { x: 25, y: 0, scale: 0.90, opacity: 1 },
    tablet:  { x: 17, y: 0, scale: 0.82, opacity: 1 },
    mobile:  { x: 2,  y: 0, scale: 0.85, opacity: 0.12 },
  },
  {
    progress: 0.97,
    frame: 284, // THE SIGNATURE CHARMING WINK & GRIN beside Contact card & Send button!
    desktop: { x: 25, y: 0, scale: 0.90, opacity: 1 },
    tablet:  { x: 17, y: 0, scale: 0.82, opacity: 1 },
    mobile:  { x: 2,  y: 0, scale: 0.86, opacity: 0.14 },
  },
  {
    progress: 1.00,
    frame: 299, // Confident finale smile beside socials & footer
    desktop: { x: 25, y: 0, scale: 0.90, opacity: 1 },
    tablet:  { x: 17, y: 0, scale: 0.82, opacity: 1 },
    mobile:  { x: 2,  y: 0, scale: 0.86, opacity: 0.14 },
  },
];

const CINEMATIC_SCROLL_MILESTONES: readonly TimelineMilestone[] = [
  {
    progress: 0.00,
    frame: 0, // Intro rest / eyes closed
    desktop: { x: 26, y: 0, scale: 0.90, opacity: 1 },
    tablet:  { x: 18, y: 0, scale: 0.82, opacity: 1 },
    mobile:  { x: 0,  y: 0, scale: 0.86, opacity: 0.22 },
  },
  {
    progress: 0.06,
    frame: 35, // Head lifts smoothly, opening eyes
    desktop: { x: 26, y: 0, scale: 0.90, opacity: 1 },
    tablet:  { x: 18, y: 0, scale: 0.82, opacity: 1 },
    mobile:  { x: 0,  y: 0, scale: 0.86, opacity: 0.22 },
  },
  {
    progress: 0.11,
    frame: 68, // Warm charismatic greeting smile centered at Hero tagline
    desktop: { x: 26, y: 0, scale: 0.90, opacity: 1 },
    tablet:  { x: 18, y: 0, scale: 0.82, opacity: 1 },
    mobile:  { x: 0,  y: 0, scale: 0.86, opacity: 0.20 },
  },
  {
    progress: 0.16,
    frame: 88, // Enters horizontal rail, head turns left to meet the project stage
    desktop: { x: 26, y: 0, scale: 0.90, opacity: 1 },
    tablet:  { x: 18, y: 0, scale: 0.82, opacity: 1 },
    mobile:  { x: 1,  y: 0, scale: 0.85, opacity: 0.14 },
  },
  {
    progress: 0.22,
    frame: 96, // Tracking initial projects in horizontal flow
    desktop: { x: 26, y: 0, scale: 0.90, opacity: 1 },
    tablet:  { x: 18, y: 0, scale: 0.82, opacity: 1 },
    mobile:  { x: 2,  y: 0, scale: 0.84, opacity: 0.10 },
  },
  {
    progress: 0.29,
    frame: 120, // Mid-rail scan across horizontal cards
    desktop: { x: 26, y: 0, scale: 0.90, opacity: 1 },
    tablet:  { x: 18, y: 0, scale: 0.82, opacity: 1 },
    mobile:  { x: 2,  y: 0, scale: 0.84, opacity: 0.10 },
  },
  {
    progress: 0.35,
    frame: 144, // Reaching end of rail / "Continue to profile" card
    desktop: { x: 26, y: 0, scale: 0.90, opacity: 1 },
    tablet:  { x: 18, y: 0, scale: 0.82, opacity: 1 },
    mobile:  { x: 2,  y: 0, scale: 0.84, opacity: 0.10 },
  },
  {
    progress: 0.37,
    frame: 168, // Enters About section: smoothly swivels to direct left orientation
    desktop: { x: 26, y: 0, scale: 0.90, opacity: 1 },
    tablet:  { x: 18, y: 0, scale: 0.82, opacity: 1 },
    mobile:  { x: 2,  y: 0, scale: 0.84, opacity: 0.12 },
  },
  {
    progress: 0.47,
    frame: 195, // PEAK DIRECT EYE CONTACT TO LEFT at About bio & principles cards!
    desktop: { x: 26, y: 0, scale: 0.90, opacity: 1 },
    tablet:  { x: 18, y: 0, scale: 0.82, opacity: 1 },
    mobile:  { x: 2,  y: 0, scale: 0.84, opacity: 0.12 },
  },
  {
    progress: 0.56,
    frame: 212, // Grounded focus finishing About principles
    desktop: { x: 26, y: 0, scale: 0.90, opacity: 1 },
    tablet:  { x: 18, y: 0, scale: 0.82, opacity: 1 },
    mobile:  { x: 2,  y: 0, scale: 0.84, opacity: 0.12 },
  },
  {
    progress: 0.60,
    frame: 224, // Enters Skills: sharp technical focus looking across technical strengths
    desktop: { x: 26, y: 0, scale: 0.90, opacity: 1 },
    tablet:  { x: 18, y: 0, scale: 0.82, opacity: 1 },
    mobile:  { x: 2,  y: 0, scale: 0.84, opacity: 0.10 },
  },
  {
    progress: 0.74,
    frame: 236, // Analytical focus across all skill pillars
    desktop: { x: 26, y: 0, scale: 0.90, opacity: 1 },
    tablet:  { x: 18, y: 0, scale: 0.82, opacity: 1 },
    mobile:  { x: 2,  y: 0, scale: 0.84, opacity: 0.10 },
  },
  {
    progress: 0.87,
    frame: 254, // Smoothly easing out of analytical focus, turning back towards center
    desktop: { x: 25, y: 0, scale: 0.90, opacity: 1 },
    tablet:  { x: 17, y: 0, scale: 0.82, opacity: 1 },
    mobile:  { x: 2,  y: 0, scale: 0.85, opacity: 0.10 },
  },
  {
    progress: 0.91,
    frame: 268, // Enters Contact: head returns toward center, warm welcoming posture
    desktop: { x: 25, y: 0, scale: 0.90, opacity: 1 },
    tablet:  { x: 17, y: 0, scale: 0.82, opacity: 1 },
    mobile:  { x: 2,  y: 0, scale: 0.85, opacity: 0.12 },
  },
  {
    progress: 0.96,
    frame: 284, // THE SIGNATURE CHARMING WINK & GRIN beside Contact card & Send button!
    desktop: { x: 25, y: 0, scale: 0.90, opacity: 1 },
    tablet:  { x: 17, y: 0, scale: 0.82, opacity: 1 },
    mobile:  { x: 2,  y: 0, scale: 0.86, opacity: 0.14 },
  },
  {
    progress: 1.00,
    frame: 299, // Confident finale smile beside socials & footer
    desktop: { x: 25, y: 0, scale: 0.90, opacity: 1 },
    tablet:  { x: 17, y: 0, scale: 0.82, opacity: 1 },
    mobile:  { x: 2,  y: 0, scale: 0.86, opacity: 0.14 },
  },
];

const getAvatarPose = ({
  horizontalProgress,
  projectViewMode,
  scrollMode,
  scrollProgress,
  viewportWidth,
}: {
  horizontalProgress: number;
  projectViewMode: 'bento' | 'cinematic';
  scrollMode: 'vertical' | 'horizontal';
  scrollProgress: number;
  viewportWidth: number;
}): AvatarPose => {
  const p = clamp(scrollProgress);
  const tier = getViewportTier(viewportWidth);
  const mobileScale = tier === 'mobile' ? clamp(viewportWidth / 390, 0.85, 1.08) : 1;

  if (scrollMode === 'horizontal') {
    // In horizontal cinematic project flow, avatar smoothly tracks across cards
    const hp = clamp(horizontalProgress);
    const hFrame = lerp(92, 148, hp) / (FRAME_COUNT - 1);
    if (tier === 'mobile') {
      return {
        frameProgress: hFrame,
        x: 0,
        y: 0,
        scale: 0.86 * mobileScale,
        opacity: 0.30,
      };
    }
    if (tier === 'tablet') {
      return {
        frameProgress: hFrame,
        x: 18,
        y: 0,
        scale: 0.82,
        opacity: 1.0,
      };
    }
    return {
      frameProgress: hFrame,
      x: lerp(27, 24, hp),
      y: 0,
      scale: 0.90,
      opacity: 1.0,
    };
  }

  // Choose the dedicated milestone set based on current projectViewMode
  const milestones = projectViewMode === 'cinematic'
    ? CINEMATIC_SCROLL_MILESTONES
    : BENTO_SCROLL_MILESTONES;

  let i = 0;
  while (i < milestones.length - 1 && p > milestones[i + 1].progress) {
    i++;
  }
  const m1 = milestones[i];
  const m2 = milestones[Math.min(i + 1, milestones.length - 1)];

  const span = m2.progress - m1.progress;
  const rawT = span > 0 ? clamp((p - m1.progress) / span) : 0;
  // Smooth cubic hermite easing (3t^2 - 2t^3) for seamless natural motion
  const t = rawT * rawT * (3 - 2 * rawT);

  const interpFrame = lerp(m1.frame, m2.frame, t);
  const frameProgress = clamp(interpFrame / (FRAME_COUNT - 1));

  if (tier === 'mobile') {
    return {
      frameProgress,
      x: lerp(m1.mobile.x, m2.mobile.x, t),
      y: lerp(m1.mobile.y, m2.mobile.y, t),
      scale: lerp(m1.mobile.scale, m2.mobile.scale, t) * mobileScale,
      opacity: lerp(m1.mobile.opacity, m2.mobile.opacity, t),
    };
  }

  if (tier === 'tablet') {
    return {
      frameProgress,
      x: lerp(m1.tablet.x, m2.tablet.x, t),
      y: lerp(m1.tablet.y, m2.tablet.y, t),
      scale: lerp(m1.tablet.scale, m2.tablet.scale, t),
      opacity: lerp(m1.tablet.opacity, m2.tablet.opacity, t),
    };
  }

  return {
    frameProgress,
    x: lerp(m1.desktop.x, m2.desktop.x, t),
    y: lerp(m1.desktop.y, m2.desktop.y, t),
    scale: lerp(m1.desktop.scale, m2.desktop.scale, t),
    opacity: lerp(m1.desktop.opacity, m2.desktop.opacity, t),
  };
};

/**
 * Pure rendering function: draws image on canvas without querying DOM dimensions.
 * Bottom-anchors the bust on desktop & tablet displays to eliminate awkward mid-screen floating.
 */
function renderImageToCanvas(
  img: HTMLImageElement,
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  highQuality = false
) {
  const isLargeScreen = width >= 768;
  const horizontalRatio = width / img.width;
  const verticalRatio = height / img.height;
  const containRatio = Math.min(horizontalRatio, verticalRatio);
  const coverRatio = Math.max(horizontalRatio, verticalRatio);
  const scaleRatio = isLargeScreen
    ? Math.min(coverRatio, containRatio * 1.20)
    : containRatio * 0.98;

  const drawWidth = img.width * scaleRatio;
  const drawHeight = img.height * scaleRatio;
  const centerShiftX = (width - drawWidth) / 2;
  // Bottom-anchored on desktop/tablet so the bust rests grounded on the viewport bottom
  const centerShiftY = isLargeScreen ? height - drawHeight : (height - drawHeight) / 2;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = highQuality ? 'high' : 'medium';
  ctx.clearRect(0, 0, width, height);
  ctx.drawImage(
    img,
    0, 0, img.width, img.height,
    centerShiftX,
    centerShiftY,
    drawWidth,
    drawHeight
  );
}

export const Scene: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Cached viewport dimensions to avoid forced DOM reflows during animation frames
  const viewportDimsRef = useRef({ width: 0, height: 0, dpr: 1 });

  // Keep anchors plus nearby frames around the current playhead; the full 300-frame
  // sequence should not remain decoded in memory after a full-page scroll.
  const lowResCache = useRef(new Map<number, HTMLImageElement>());
  const lowResLoadingSet = useRef(new Set<number>());

  // High-res WebP frames are only fetched for desktop resting views and kept in a bounded cache.
  const highResCache = useRef(new Map<number, HTMLImageElement>());
  const highResLoadingSet = useRef(new Set<number>());

  const restingTimerRef = useRef<number | null>(null);
  const lastDrawnTypeRef = useRef<'lowres' | 'highres'>('lowres');

  const poseRef = useRef<AvatarPose | null>(null);
  const lastDrawnFrameIndexRef = useRef(-1);
  const currentRequestedIndexRef = useRef(0);

  const theme = useStore((s) => s.theme);

  const setAvatarReady = useStore((s) => s.setAvatarReady);

  const getLowResUrl = useCallback((index: number) => {
    const baseUrl = import.meta.env.BASE_URL || '/';
    const frameNumber = String(index + 1).padStart(4, '0');
    const folder = LOW_RES_ANCHOR_SET.has(index) ? 'frames-anchors' : 'frames-lowres';
    return `${baseUrl}${folder}/male${frameNumber}.webp`;
  }, []);

  const getHighResUrl = useCallback((index: number) => {
    const baseUrl = import.meta.env.BASE_URL || '/';
    const frameNumber = String(index + 1).padStart(4, '0');
    return `${baseUrl}frames/male${frameNumber}.webp`;
  }, []);

  const lowResCallbacks = useRef(new Map<number, Array<(img: HTMLImageElement) => void>>());
  const highResCallbacks = useRef(new Map<number, Array<(img: HTMLImageElement) => void>>());

  /**
   * Loads a low-res WebP frame into cache if not already loaded or in flight.
   */
  const requestLowResFrame = useCallback((
    index: number,
    onLoaded?: (img: HTMLImageElement) => void,
    fetchPriority: 'high' | 'low' | 'auto' = 'high',
  ) => {
    const safeIndex = Math.min(FRAME_COUNT - 1, Math.max(0, index));
    if (lowResCache.current.has(safeIndex)) {
      const existing = lowResCache.current.get(safeIndex)!;
      if (existing.complete && existing.naturalWidth > 0 && onLoaded) {
        onLoaded(existing);
      }
      return;
    }

    if (onLoaded) {
      const cbs = lowResCallbacks.current.get(safeIndex) || [];
      cbs.push(onLoaded);
      lowResCallbacks.current.set(safeIndex, cbs);
    }

    if (lowResLoadingSet.current.has(safeIndex)) return;

    lowResLoadingSet.current.add(safeIndex);
    const img = new Image();
    img.decoding = 'async';
    img.fetchPriority = fetchPriority;
    img.src = getLowResUrl(safeIndex);

    img.onload = () => {
      lowResLoadingSet.current.delete(safeIndex);
      lowResCache.current.set(safeIndex, img);
      while (lowResCache.current.size > MAX_LOW_RES_CACHE) {
        let farthestIndex = -1;
        let farthestDistance = -1;
        for (const cachedIndex of lowResCache.current.keys()) {
          if (LOW_RES_ANCHOR_SET.has(cachedIndex) || cachedIndex === safeIndex) continue;
          const distance = Math.abs(cachedIndex - currentRequestedIndexRef.current);
          if (distance > farthestDistance) {
            farthestIndex = cachedIndex;
            farthestDistance = distance;
          }
        }
        if (farthestIndex < 0) break;
        lowResCache.current.delete(farthestIndex);
      }
      if (safeIndex === 0) {
        setAvatarReady(true);
      }
      const cbs = lowResCallbacks.current.get(safeIndex);
      lowResCallbacks.current.delete(safeIndex);
      if (cbs) {
        cbs.forEach((cb) => cb(img));
      }
    };

    img.onerror = () => {
      lowResLoadingSet.current.delete(safeIndex);
      lowResCallbacks.current.delete(safeIndex);
    };
  }, [getLowResUrl, setAvatarReady]);

  /**
   * Loads a high-quality WebP frame with LRU cache eviction to guarantee bounded memory.
   */
  const requestHighResFrame = useCallback((index: number, onLoaded?: (img: HTMLImageElement) => void) => {
    const safeIndex = Math.min(FRAME_COUNT - 1, Math.max(0, index));
    if (highResCache.current.has(safeIndex)) {
      const existing = highResCache.current.get(safeIndex)!;
      // Refresh LRU order (delete and re-insert at end)
      highResCache.current.delete(safeIndex);
      highResCache.current.set(safeIndex, existing);
      if (existing.complete && existing.naturalWidth > 0 && onLoaded) {
        onLoaded(existing);
      }
      return;
    }

    if (onLoaded) {
      const cbs = highResCallbacks.current.get(safeIndex) || [];
      cbs.push(onLoaded);
      highResCallbacks.current.set(safeIndex, cbs);
    }

    if (highResLoadingSet.current.has(safeIndex)) return;

    highResLoadingSet.current.add(safeIndex);
    const img = new Image();
    img.decoding = 'async';
    img.fetchPriority = 'low';
    img.src = getHighResUrl(safeIndex);

    img.onload = () => {
      highResLoadingSet.current.delete(safeIndex);
      // Evict the oldest other frame. The canvas keeps its pixels after an image
      // leaves this map, so retaining the last drawn source is unnecessary.
      while (highResCache.current.size >= MAX_HIGH_RES_CACHE) {
        const oldestOtherKey = Array.from(highResCache.current.keys()).find((key) => key !== safeIndex);
        if (oldestOtherKey === undefined) break;
        highResCache.current.delete(oldestOtherKey);
      }
      highResCache.current.set(safeIndex, img);
      const cbs = highResCallbacks.current.get(safeIndex);
      highResCallbacks.current.delete(safeIndex);
      if (cbs) {
        cbs.forEach((cb) => cb(img));
      }
    };

    img.onerror = () => {
      highResLoadingSet.current.delete(safeIndex);
      highResCallbacks.current.delete(safeIndex);
    };
  }, [getHighResUrl]);

  const scrubDebounceRef = useRef<number | null>(null);

  /**
   * Pre-fetches the immediate next frame in the direction of scroll.
   * Single-frame lookahead avoids saturating localhost network bandwidth.
   */
  const prefetchNext = useCallback((centerIndex: number, direction: number = 1) => {
    const nextIdx = centerIndex + direction;
    if (nextIdx >= 0 && nextIdx < FRAME_COUNT) {
      requestLowResFrame(nextIdx, undefined, 'low');
    }
  }, [requestLowResFrame]);

  const lastTransformRef = useRef('');
  const lastOpacityRef = useRef('');

  /**
   * Debounced swap to high-res PNG when scroll settles on a resting frame.
   */
  const scheduleHighResRestingSwap = useCallback((targetIndex: number) => {
    if (restingTimerRef.current !== null) {
      window.clearTimeout(restingTimerRef.current);
    }

    restingTimerRef.current = window.setTimeout(() => {
      if (currentRequestedIndexRef.current === targetIndex && window.innerWidth >= 768 && document.visibilityState === 'visible') {
        requestHighResFrame(targetIndex, (highResImg) => {
          if (currentRequestedIndexRef.current === targetIndex) {
            const canvas = canvasRef.current;
            if (!canvas) return;
            const ctx = canvas.getContext('2d', { alpha: true, desynchronized: true });
            const { width, height } = viewportDimsRef.current;
            if (ctx && width > 0 && height > 0) {
              renderImageToCanvas(highResImg, ctx, width, height, true);
              lastDrawnFrameIndexRef.current = targetIndex;
              lastDrawnTypeRef.current = 'highres';
            }
          }
        });
      }
    }, 650);
  }, [requestHighResFrame]);

  // A frame that finished decoding a little late can still improve the display.
  // Keep it only when it is closer to the current playhead than what's on canvas.
  const paintLowResIfCloser = useCallback((index: number, img: HTMLImageElement) => {
    const currentIndex = currentRequestedIndexRef.current;
    const shownDistance = lastDrawnFrameIndexRef.current < 0
      ? Infinity
      : Math.abs(lastDrawnFrameIndexRef.current - currentIndex);
    if (Math.abs(index - currentIndex) > shownDistance) return;

    const { width, height } = viewportDimsRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d', { alpha: true, desynchronized: true });
    if (!canvas || !ctx || width <= 0 || height <= 0) return;

    renderImageToCanvas(img, ctx, width, height, false);
    lastDrawnFrameIndexRef.current = index;
    lastDrawnTypeRef.current = 'lowres';
    if (currentIndex === index) scheduleHighResRestingSwap(index);
  }, [scheduleHighResRestingSwap]);

  /**
   * Draws the requested frame or immediately falls back to the nearest available frame.
   * Velocity-aware: during high-speed scrubs (>4 frames/tick), instantly paints the nearest anchor
   * frame and debounces single-frame network fetches to prevent connection starvation.
   */
  const drawFrame = useCallback((index: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true, desynchronized: true });
    if (!ctx) return;

    const safeIndex = Math.min(FRAME_COUNT - 1, Math.max(0, index));
    const previousIndex = currentRequestedIndexRef.current;
    currentRequestedIndexRef.current = safeIndex;
    const direction = safeIndex >= previousIndex ? 1 : -1;
    const velocity = Math.abs(safeIndex - previousIndex);

    const { width, height } = viewportDimsRef.current;
    if (width <= 0 || height <= 0) return;

    // 1. Check if exact high-res frame is already available in LRU cache
    const exactHighRes = highResCache.current.get(safeIndex);
    if (exactHighRes && exactHighRes.complete && exactHighRes.naturalWidth > 0) {
      highResCache.current.delete(safeIndex);
      highResCache.current.set(safeIndex, exactHighRes);
      renderImageToCanvas(exactHighRes, ctx, width, height, true);
      lastDrawnFrameIndexRef.current = safeIndex;
      lastDrawnTypeRef.current = 'highres';
      prefetchNext(safeIndex, direction);
      return;
    }

    // 2. Check if exact low-res frame is available
    const exactLowRes = lowResCache.current.get(safeIndex);
    if (exactLowRes && exactLowRes.complete && exactLowRes.naturalWidth > 0) {
      renderImageToCanvas(exactLowRes, ctx, width, height, false);
      lastDrawnFrameIndexRef.current = safeIndex;
      lastDrawnTypeRef.current = 'lowres';
      prefetchNext(safeIndex, direction);
      scheduleHighResRestingSwap(safeIndex);
      return;
    }

    // 3. Fallback: Find nearest loaded frame in either cache for INSTANT display (<= 6 frames away)
    let nearestImg: HTMLImageElement | null = null;
    let nearestIndex = -1;
    let nearestType: 'lowres' | 'highres' = 'lowres';

    // Fast outward search - O(1) hash lookups instead of O(N) full-cache traversal
    for (let offset = 1; offset <= 30; offset++) {
      const prev = safeIndex - offset;
      const next = safeIndex + offset;

      if (prev >= 0 && lowResCache.current.has(prev)) {
        nearestImg = lowResCache.current.get(prev)!;
        nearestIndex = prev;
        nearestType = 'lowres';
        break;
      }
      if (next < FRAME_COUNT && lowResCache.current.has(next)) {
        nearestImg = lowResCache.current.get(next)!;
        nearestIndex = next;
        nearestType = 'lowres';
        break;
      }
    }

    // Fallback to highResCache anchor check if still not found
    if (!nearestImg) {
      let minDiff = Infinity;
      for (const [cachedIdx, img] of highResCache.current.entries()) {
        const diff = Math.abs(cachedIdx - safeIndex);
        if (diff < minDiff) {
          minDiff = diff;
          nearestImg = img;
          nearestIndex = cachedIdx;
          nearestType = 'highres';
        }
      }
    }

    if (nearestImg) {
      renderImageToCanvas(nearestImg, ctx, width, height, nearestType === 'highres');
      lastDrawnFrameIndexRef.current = nearestIndex;
      lastDrawnTypeRef.current = nearestType;
    }

    // 4. Velocity-aware network dispatch:
    // If scrolling rapidly (> 4 frames per tick), debounce intermediate requests to avoid saturating HTTP pipelines
    if (velocity > 4) {
      if (scrubDebounceRef.current !== null) {
        window.clearTimeout(scrubDebounceRef.current);
      }
      scrubDebounceRef.current = window.setTimeout(() => {
        requestLowResFrame(safeIndex, (loadedImg) => paintLowResIfCloser(safeIndex, loadedImg));
      }, 45);
    } else {
      // Normal or settled speed: request immediately
      requestLowResFrame(safeIndex, (loadedImg) => paintLowResIfCloser(safeIndex, loadedImg));
      prefetchNext(safeIndex, direction);
    }

    scheduleHighResRestingSwap(safeIndex);
  }, [paintLowResIfCloser, prefetchNext, requestLowResFrame, scheduleHighResRestingSwap]);

  const applyPose = useCallback((pose: AvatarPose) => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const frameIndex = Math.min(
      FRAME_COUNT - 1,
      Math.max(0, Math.round(pose.frameProgress * (FRAME_COUNT - 1)))
    );

    // The displayed fallback can be several frames away from the playhead.
    // Track the requested frame separately to avoid redrawing that same fallback
    // on every animation tick while its exact frame is still loading.
    if (frameIndex !== currentRequestedIndexRef.current || lastDrawnFrameIndexRef.current < 0) {
      drawFrame(frameIndex);
    }

    const nextOpacity = pose.opacity.toFixed(3);
    if (nextOpacity !== lastOpacityRef.current) {
      lastOpacityRef.current = nextOpacity;
      canvas.style.opacity = nextOpacity;
    }
    const nextTransform = `translate3d(${pose.x.toFixed(2)}vw, ${pose.y.toFixed(2)}vh, 0) scale(${pose.scale.toFixed(3)})`;
    if (nextTransform !== lastTransformRef.current) {
      lastTransformRef.current = nextTransform;
      canvas.style.transform = nextTransform;
    }
  }, [drawFrame]);

  // Theme changes do not move the scroll playhead, so they previously left the
  // canvas on its last low-resolution fallback. Repaint the existing pose and
  // request its sharp source immediately when the theme changes.
  useEffect(() => {
    const pose = poseRef.current;
    if (!pose) return;

    applyPose(pose);

    if (window.innerWidth < 768) return;
    const frameIndex = Math.min(
      FRAME_COUNT - 1,
      Math.max(0, Math.round(pose.frameProgress * (FRAME_COUNT - 1))),
    );

    requestHighResFrame(frameIndex, (highResImg) => {
      if (currentRequestedIndexRef.current !== frameIndex) return;
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d', { alpha: true, desynchronized: true });
      const { width, height } = viewportDimsRef.current;
      if (!canvas || !ctx || width <= 0 || height <= 0) return;

      renderImageToCanvas(highResImg, ctx, width, height, true);
      lastDrawnFrameIndexRef.current = frameIndex;
      lastDrawnTypeRef.current = 'highres';
    });
  }, [applyPose, requestHighResFrame, theme]);

  // Sync canvas size and precompute viewport dimensions
  useEffect(() => {
    const syncCanvasSize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d', { alpha: true, desynchronized: true });
      if (!ctx) return;

      // A modest backing resolution cuts canvas work substantially on Retina screens.
      // Size the bitmap from the stable fixed layer so mobile browser chrome
      // expanding during a swipe cannot repeatedly clear and resize the canvas.
      const width = containerRef.current?.clientWidth || window.innerWidth;
      const height = containerRef.current?.clientHeight || window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, width < 768 ? 1 : 1.1);
      const previous = viewportDimsRef.current;
      if (previous.width === width && previous.height === height && previous.dpr === dpr) return;

      viewportDimsRef.current = { width, height, dpr };

      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Invalidate last drawn frame to force repaint on size change
      lastDrawnFrameIndexRef.current = -1;

      const state = useStore.getState();
      const nextPose = getAvatarPose({
        horizontalProgress: state.horizontalProgress,
        projectViewMode: state.projectViewMode,
        scrollMode: state.scrollMode,
        scrollProgress: state.scrollProgress,
        viewportWidth: width,
      });

      poseRef.current = nextPose;
      applyPose(nextPose);
    };

    window.addEventListener('resize', syncCanvasSize);
    syncCanvasSize();

    return () => {
      window.removeEventListener('resize', syncCanvasSize);
    };
  }, [applyPose]);

  // Load the hero and a small nearby cluster first, then seed low-res anchor frames.
  useEffect(() => {
    // 1. Frame 0 low-res for instant paint
    requestLowResFrame(0, () => {
      drawFrame(0);
    });

    // Keep the first few frames ready for the opening movement.
    for (let i = 1; i <= 6; i++) {
      requestLowResFrame(i, undefined, 'low');
    }

    // Seed the remaining sequence in small, low-priority groups. Large bursts of
    // simultaneous image decodes competed with wheel scrolling on slower devices.
    const anchorQueue = LOW_RES_ANCHOR_KEYFRAMES.filter((frame) => frame > 6);
    // Seed the entire timeline early. A user who scrolls straight to the end
    // gets a nearby cached frame while the remaining anchors load in the background.
    const earlyCount = Math.min(12, anchorQueue.length);
    const earlyAnchors = Array.from({ length: earlyCount }, (_, index) =>
      anchorQueue[Math.floor(index * (anchorQueue.length - 1) / Math.max(1, earlyCount - 1))],
    );
    const earlyAnchorSet = new Set(earlyAnchors);
    earlyAnchors.forEach((frame) => requestLowResFrame(frame, undefined, 'low'));
    const remainingAnchors = anchorQueue.filter((frame) => !earlyAnchorSet.has(frame));
    let cursor = 0;
    let preloadTimer: number | null = null;
    const preloadNextBatch = () => {
      const batch = remainingAnchors.slice(cursor, cursor + 8);
      cursor += batch.length;
      batch.forEach((frame) => requestLowResFrame(frame, undefined, 'low'));
      if (cursor < remainingAnchors.length) {
        preloadTimer = window.setTimeout(preloadNextBatch, 120);
      }
    };
    preloadTimer = window.setTimeout(preloadNextBatch, 120);

    return () => {
      if (preloadTimer !== null) window.clearTimeout(preloadTimer);
      if (restingTimerRef.current !== null) {
        clearTimeout(restingTimerRef.current);
      }
      if (scrubDebounceRef.current !== null) {
        clearTimeout(scrubDebounceRef.current);
      }
    };
  }, [drawFrame, requestLowResFrame]);

  // Smooth scroll-driven animation loop with persistent critically-damped spring physics
  useEffect(() => {
    let animationFrameId: number | null = null;
    let lastTickTime = 0;
    const targetPoseRef = { current: poseRef.current };

    const tick = (now: number) => {
      animationFrameId = null;
      const target = targetPoseRef.current;
      const current = poseRef.current;
      if (!target || !current) return;

      const isMobile = window.innerWidth < 768;
      // Time-based damping keeps the motion consistent on 60 Hz and 120 Hz displays.
      const deltaMs = lastTickTime === 0 ? 16.67 : Math.min(50, Math.max(1, now - lastTickTime));
      lastTickTime = now;
      const positionEase = 1 - Math.exp(-deltaMs / 54);
      const scaleEase = 1 - Math.exp(-deltaMs / 72);
      const frameDelta = Math.abs(target.frameProgress - current.frameProgress);
      const frameEase = isMobile ? 1 : frameDelta > 0.075 ? 0.9 : 1 - Math.exp(-deltaMs / 20);

      const nextPose: AvatarPose = {
        frameProgress: lerp(current.frameProgress, target.frameProgress, frameEase),
        x: lerp(current.x, target.x, positionEase),
        y: lerp(current.y, target.y, positionEase),
        scale: lerp(current.scale, target.scale, scaleEase),
        opacity: lerp(current.opacity, target.opacity, positionEase),
      };

      const settled =
        Math.abs(nextPose.frameProgress - target.frameProgress) < 0.0006 &&
        Math.abs(nextPose.x - target.x) < 0.02 &&
        Math.abs(nextPose.y - target.y) < 0.02 &&
        Math.abs(nextPose.scale - target.scale) < 0.001 &&
        Math.abs(nextPose.opacity - target.opacity) < 0.005;

      const resolved = settled ? target : nextPose;
      poseRef.current = resolved;
      applyPose(resolved);

      if (!settled) {
        animationFrameId = window.requestAnimationFrame(tick);
      }
    };

    const requestTick = () => {
      if (animationFrameId === null) {
        animationFrameId = window.requestAnimationFrame(tick);
      }
    };

    const unsubscribe = useStore.subscribe((state) => {
      const nextTarget = getAvatarPose({
        horizontalProgress: state.horizontalProgress,
        projectViewMode: state.projectViewMode,
        scrollMode: state.scrollMode,
        scrollProgress: state.scrollProgress,
        viewportWidth: window.innerWidth,
      });

      targetPoseRef.current = nextTarget;

      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || poseRef.current === null) {
        poseRef.current = nextTarget;
        applyPose(nextTarget);
        return;
      }

      requestTick();
    });

    return () => {
      unsubscribe();
      if (animationFrameId !== null) {
        window.cancelAnimationFrame(animationFrameId);
      }
    };
  }, [applyPose]);

  return (
    <div
      ref={containerRef}
      className="canvas-container"
    >
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
          transform: 'translate3d(0, 0, 0) scale(1)',
          transformOrigin: 'center bottom',
          willChange: 'transform, opacity',
          opacity: 0,
          filter: 'none',
        }}
      />
    </div>
  );
};

export default Scene;
