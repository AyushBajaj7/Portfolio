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
 * aligning the character adjacent to the content of each section.
 *
 * Choreography Flow:
 * 1. Hero (p: 0.00 -> 0.14): Awakening (0) -> head lifts (32) -> charismatic greeting smile (60) looking across at the name/title.
 * 2. Projects (p: 0.14 -> 0.52): Confident technical smirk (82) -> head scans systems and architectures (120 -> 142).
 * 3. About (p: 0.52 -> 0.72): Contemplative turn (168) -> DIRECT EYE CONTACT TO LEFT (195) looking right at the philosophy and principles cards!
 * 4. Skills (p: 0.72 -> 0.86): Sharp technical analysis (218) looking left at the skill pills -> prepares for finale (255).
 * 5. Contact (p: 0.86 -> 1.00): Face centers -> SIGNATURE WINK & SMIRK (284) -> warm finale smile (299) beside the contact card!
 */
const SCROLL_MILESTONES: readonly TimelineMilestone[] = [
  {
    progress: 0.00,
    frame: 0, // Intro rest / eyes closed
    desktop: { x: 21, y: 3, scale: 0.86, opacity: 0.92 },
    tablet:  { x: 23, y: 3, scale: 0.76, opacity: 0.92 },
    mobile:  { x: 0,  y: -2, scale: 0.84, opacity: 0.55 },
  },
  {
    progress: 0.06,
    frame: 35, // Head lifts smoothly, eyes open
    desktop: { x: 21, y: 3, scale: 0.86, opacity: 0.92 },
    tablet:  { x: 23, y: 3, scale: 0.76, opacity: 0.92 },
    mobile:  { x: 0,  y: -2, scale: 0.84, opacity: 0.55 },
  },
  {
    progress: 0.14,
    frame: 60, // Warm charismatic smile, head tilted towards Hero title & bio
    desktop: { x: 22, y: 3, scale: 0.85, opacity: 0.92 },
    tablet:  { x: 23, y: 4, scale: 0.75, opacity: 0.92 },
    mobile:  { x: 0,  y: -1, scale: 0.84, opacity: 0.52 },
  },
  {
    progress: 0.22,
    frame: 82, // Confident technical smirk, entering Projects
    desktop: { x: 27, y: 2, scale: 0.83, opacity: 0.72 },
    tablet:  { x: 25, y: 2, scale: 0.74, opacity: 0.80 },
    mobile:  { x: 0,  y: 6, scale: 0.78, opacity: 0.35 },
  },
  {
    progress: 0.35,
    frame: 120, // Head turned right, scanning architecture bento & system diagrams
    desktop: { x: 29, y: 2, scale: 0.82, opacity: 0.68 },
    tablet:  { x: 26, y: 3, scale: 0.72, opacity: 0.75 },
    mobile:  { x: 0,  y: 6, scale: 0.76, opacity: 0.32 },
  },
  {
    progress: 0.46,
    frame: 142, // Thoughtful glance across platforms
    desktop: { x: 28, y: 3, scale: 0.83, opacity: 0.72 },
    tablet:  { x: 25, y: 4, scale: 0.73, opacity: 0.78 },
    mobile:  { x: 0,  y: 7, scale: 0.78, opacity: 0.35 },
  },
  {
    progress: 0.53,
    frame: 168, // Smooth rotation turning left toward About section
    desktop: { x: 28, y: 4, scale: 0.85, opacity: 0.88 },
    tablet:  { x: 24, y: 4, scale: 0.75, opacity: 0.88 },
    mobile:  { x: 10, y: -12, scale: 0.82, opacity: 0.65 },
  },
  {
    progress: 0.62,
    frame: 195, // PEAK GAZE TO THE LEFT at About bio & principles cards!
    desktop: { x: 29, y: 4, scale: 0.86, opacity: 0.90 },
    tablet:  { x: 25, y: 5, scale: 0.76, opacity: 0.90 },
    mobile:  { x: 12, y: -14, scale: 0.82, opacity: 0.68 },
  },
  {
    progress: 0.74,
    frame: 228, // Eyes wide open with piercing technical focus, looking left at skills
    desktop: { x: 28, y: 5, scale: 0.85, opacity: 0.86 },
    tablet:  { x: 24, y: 5, scale: 0.75, opacity: 0.88 },
    mobile:  { x: 12, y: -14, scale: 0.82, opacity: 0.65 },
  },
  {
    progress: 0.84,
    frame: 252, // Head returning toward center, welcoming connection
    desktop: { x: 24, y: 5, scale: 0.86, opacity: 0.90 },
    tablet:  { x: 23, y: 5, scale: 0.76, opacity: 0.90 },
    mobile:  { x: 14, y: -16, scale: 0.86, opacity: 0.85 },
  },
  {
    progress: 0.93,
    frame: 284, // THE SIGNATURE CHARMING WINK & GRIN beside Contact card!
    desktop: { x: 22, y: 5, scale: 0.88, opacity: 0.94 },
    tablet:  { x: 23, y: 4, scale: 0.78, opacity: 0.92 },
    mobile:  { x: 15, y: -16, scale: 0.88, opacity: 0.92 },
  },
  {
    progress: 1.00,
    frame: 299, // Confident finale smile
    desktop: { x: 22, y: 5, scale: 0.88, opacity: 0.94 },
    tablet:  { x: 23, y: 4, scale: 0.78, opacity: 0.92 },
    mobile:  { x: 15, y: -16, scale: 0.88, opacity: 0.92 },
  },
];

const getAvatarPose = ({
  activeSection: _activeSection,
  horizontalProgress,
  scrollMode,
  scrollProgress,
  viewportWidth,
}: {
  activeSection?: string;
  horizontalProgress: number;
  scrollMode: 'vertical' | 'horizontal';
  scrollProgress: number;
  viewportWidth: number;
}): AvatarPose => {
  const p = clamp(scrollProgress);
  const tier = getViewportTier(viewportWidth);
  const mobileScale = tier === 'mobile' ? clamp(viewportWidth / 390, 1.4, 2.2) : 1;

  if (scrollMode === 'horizontal') {
    // In horizontal cinematic project flow, avatar smoothly tracks across cards
    const hp = clamp(horizontalProgress);
    const hFrame = lerp(85, 138, hp) / (FRAME_COUNT - 1);
    if (tier === 'mobile') {
      return {
        frameProgress: hFrame,
        x: 0,
        y: lerp(8, 12, hp),
        scale: lerp(0.80, 0.88, hp) * mobileScale,
        opacity: 0.42,
      };
    }
    if (tier === 'tablet') {
      return {
        frameProgress: hFrame,
        x: lerp(22, 14, hp),
        y: lerp(2, 6, hp),
        scale: lerp(0.66, 0.72, hp),
        opacity: 0.82,
      };
    }
    return {
      frameProgress: hFrame,
      x: lerp(28, 18, hp),
      y: lerp(0, 4, hp),
      scale: lerp(0.64, 0.70, hp),
      opacity: 0.80,
    };
  }

  // Find surrounding milestones
  let i = 0;
  while (i < SCROLL_MILESTONES.length - 1 && p > SCROLL_MILESTONES[i + 1].progress) {
    i++;
  }
  const m1 = SCROLL_MILESTONES[i];
  const m2 = SCROLL_MILESTONES[Math.min(i + 1, SCROLL_MILESTONES.length - 1)];

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
    ? Math.min(coverRatio, containRatio * 1.18)
    : containRatio * 0.96;

  const drawWidth = img.width * scaleRatio;
  const drawHeight = img.height * scaleRatio;
  const centerShiftX = (width - drawWidth) / 2;
  const centerShiftY = (height - drawHeight) / 2;

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

  // Map of loaded low-res WebP frames (~22KB each). Total memory overhead: ~60MB RAM instead of 3GB.
  const lowResCache = useRef(new Map<number, HTMLImageElement>());
  const lowResLoadingSet = useRef(new Set<number>());

  // Bounded LRU cache of high-res PNG frames (1920x1080).
  // Capped at 25 frames (~200MB RAM max) to provide razor-sharp resting views without memory bloat or OOM.
  const MAX_HIGHRES_CACHE = 25;
  const highResCache = useRef(new Map<number, HTMLImageElement>());
  const highResLoadingSet = useRef(new Set<number>());

  const restingTimerRef = useRef<number | null>(null);
  const lastDrawnTypeRef = useRef<'lowres' | 'highres'>('lowres');

  const poseRef = useRef<AvatarPose | null>(null);
  const lastDrawnFrameIndexRef = useRef(-1);
  const currentRequestedIndexRef = useRef(0);

  const theme = useStore((s) => s.theme);
  const themeRef = useRef(theme);
  useEffect(() => { themeRef.current = theme; }, [theme]);

  const setAvatarReady = useStore((s) => s.setAvatarReady);

  const getLowResUrl = useCallback((index: number) => {
    const baseUrl = import.meta.env.BASE_URL || '/';
    const frameNumber = String(index + 1).padStart(4, '0');
    return `${baseUrl}frames-lowres/male${frameNumber}.webp`;
  }, []);

  const getHighResUrl = useCallback((index: number) => {
    const baseUrl = import.meta.env.BASE_URL || '/';
    const frameNumber = String(index + 1).padStart(4, '0');
    return `${baseUrl}frames/male${frameNumber}.png`;
  }, []);

  const lowResCallbacks = useRef(new Map<number, Array<(img: HTMLImageElement) => void>>());
  const highResCallbacks = useRef(new Map<number, Array<(img: HTMLImageElement) => void>>());

  /**
   * Loads a low-res WebP frame into cache if not already loaded or in flight.
   */
  const requestLowResFrame = useCallback((index: number, onLoaded?: (img: HTMLImageElement) => void) => {
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
    img.src = getLowResUrl(safeIndex);

    img.onload = () => {
      lowResLoadingSet.current.delete(safeIndex);
      lowResCache.current.set(safeIndex, img);
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
   * Loads a high-res 1080p PNG frame with LRU cache eviction to guarantee bounded memory.
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
    img.src = getHighResUrl(safeIndex);

    img.onload = () => {
      highResLoadingSet.current.delete(safeIndex);
      // Evict oldest entry if cache capacity reached
      if (highResCache.current.size >= MAX_HIGHRES_CACHE) {
        const oldestKey = highResCache.current.keys().next().value;
        if (oldestKey !== undefined && oldestKey !== lastDrawnFrameIndexRef.current) {
          highResCache.current.delete(oldestKey);
        }
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
   * 25 Anchor Keyframes spaced across the 300-frame sequence (every 12 frames).
   * Pre-seeded immediately after Hero paint (~550KB total) so a rendered frame
   * is guaranteed to be <= 6 frames away regardless of scroll fling speed.
   */
  const ANCHOR_KEYFRAMES = useRef([
    0, 12, 24, 36, 48, 60, 72, 84, 96, 108, 120, 132, 144, 156, 168, 180, 192, 204, 216, 228, 240, 252, 264, 276, 288, 299
  ]).current;

  // Major section landing frames for crystal-clear high-res resting views
  const SECTION_HIGHRES_FRAMES = useRef([0, 60, 82, 120, 168, 195, 218, 284, 299]).current;

  /**
   * Pre-fetches the immediate next frame in the direction of scroll.
   * Single-frame lookahead avoids saturating localhost network bandwidth.
   */
  const prefetchNext = useCallback((centerIndex: number, direction: number = 1) => {
    const nextIdx = centerIndex + direction;
    if (nextIdx >= 0 && nextIdx < FRAME_COUNT) {
      requestLowResFrame(nextIdx);
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
      if (currentRequestedIndexRef.current === targetIndex) {
        requestHighResFrame(targetIndex, (highResImg) => {
          if (currentRequestedIndexRef.current === targetIndex) {
            const canvas = canvasRef.current;
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            const { width, height } = viewportDimsRef.current;
            if (ctx && width > 0 && height > 0) {
              renderImageToCanvas(highResImg, ctx, width, height, true);
              lastDrawnFrameIndexRef.current = targetIndex;
              lastDrawnTypeRef.current = 'highres';
            }
          }
        });
      }
    }, 90);
  }, [requestHighResFrame]);

  /**
   * Draws the requested frame or immediately falls back to the nearest available frame.
   * Velocity-aware: during high-speed scrubs (>4 frames/tick), instantly paints the nearest anchor
   * frame and debounces single-frame network fetches to prevent connection starvation.
   */
  const drawFrame = useCallback((index: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
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
    let minDiff = Infinity;
    let nearestIndex = -1;
    let nearestType: 'lowres' | 'highres' = 'lowres';

    for (const [cachedIdx, img] of highResCache.current.entries()) {
      if (img.complete && img.naturalWidth > 0) {
        const diff = Math.abs(cachedIdx - safeIndex);
        if (diff < minDiff) {
          minDiff = diff;
          nearestImg = img;
          nearestIndex = cachedIdx;
          nearestType = 'highres';
        }
      }
    }

    for (const [cachedIdx, img] of lowResCache.current.entries()) {
      if (img.complete && img.naturalWidth > 0) {
        const diff = Math.abs(cachedIdx - safeIndex);
        if (diff < minDiff) {
          minDiff = diff;
          nearestImg = img;
          nearestIndex = cachedIdx;
          nearestType = 'lowres';
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
        requestLowResFrame(safeIndex, (loadedImg) => {
          if (Math.abs(currentRequestedIndexRef.current - safeIndex) <= 1) {
            const currentDims = viewportDimsRef.current;
            if (currentDims.width > 0 && currentDims.height > 0 && canvasRef.current) {
              const cCtx = canvasRef.current.getContext('2d');
              if (cCtx) {
                renderImageToCanvas(loadedImg, cCtx, currentDims.width, currentDims.height, false);
                lastDrawnFrameIndexRef.current = safeIndex;
                lastDrawnTypeRef.current = 'lowres';
                if (currentRequestedIndexRef.current === safeIndex) {
                  scheduleHighResRestingSwap(safeIndex);
                }
              }
            }
          }
        });
      }, 45);
    } else {
      // Normal or settled speed: request immediately
      requestLowResFrame(safeIndex, (loadedImg) => {
        if (Math.abs(currentRequestedIndexRef.current - safeIndex) <= 1) {
          const currentDims = viewportDimsRef.current;
          if (currentDims.width > 0 && currentDims.height > 0 && canvasRef.current) {
            const cCtx = canvasRef.current.getContext('2d');
            if (cCtx) {
              renderImageToCanvas(loadedImg, cCtx, currentDims.width, currentDims.height, false);
              lastDrawnFrameIndexRef.current = safeIndex;
              lastDrawnTypeRef.current = 'lowres';
              if (currentRequestedIndexRef.current === safeIndex) {
                scheduleHighResRestingSwap(safeIndex);
              }
            }
          }
        }
      });
      prefetchNext(safeIndex, direction);
    }

    scheduleHighResRestingSwap(safeIndex);
  }, [prefetchNext, requestLowResFrame, scheduleHighResRestingSwap]);

  const applyPose = useCallback((pose: AvatarPose) => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const frameIndex = Math.min(
      FRAME_COUNT - 1,
      Math.max(0, Math.round(pose.frameProgress * (FRAME_COUNT - 1)))
    );

    if (frameIndex !== lastDrawnFrameIndexRef.current) {
      drawFrame(frameIndex);
    }

    const visibleOpacity = themeRef.current === 'light' ? Math.min(0.98, pose.opacity + 0.16) : pose.opacity;
    const nextOpacity = visibleOpacity.toFixed(3);
    if (nextOpacity !== lastOpacityRef.current) {
      lastOpacityRef.current = nextOpacity;
      container.style.opacity = nextOpacity;
    }
    const nextTransform = `translate3d(${pose.x.toFixed(2)}vw, ${pose.y.toFixed(2)}vh, 0) scale(${pose.scale.toFixed(3)})`;
    if (nextTransform !== lastTransformRef.current) {
      lastTransformRef.current = nextTransform;
      canvas.style.transform = nextTransform;
    }
  }, [drawFrame]);

  // Sync canvas size and precompute viewport dimensions
  useEffect(() => {
    const syncCanvasSize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr = Math.min(window.devicePixelRatio || 1, window.innerWidth < 768 ? 2 : 1.5);
      const width = window.innerWidth;
      const height = window.innerWidth < 768 ? (window.visualViewport?.height ?? window.innerHeight) : window.innerHeight;

      viewportDimsRef.current = { width, height, dpr };

      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Invalidate last drawn frame to force repaint on size change
      lastDrawnFrameIndexRef.current = -1;

      const state = useStore.getState();
      const nextPose = getAvatarPose({
        activeSection: state.activeSection,
        horizontalProgress: state.horizontalProgress,
        scrollMode: state.scrollMode,
        scrollProgress: state.scrollProgress,
        viewportWidth: width,
      });

      poseRef.current = nextPose;
      applyPose(nextPose);
    };

    window.addEventListener('resize', syncCanvasSize);
    window.visualViewport?.addEventListener('resize', syncCanvasSize);
    syncCanvasSize();

    return () => {
      window.removeEventListener('resize', syncCanvasSize);
      window.visualViewport?.removeEventListener('resize', syncCanvasSize);
    };
  }, [applyPose]);

  // Priority Bootstrap: Eagerly load Frame 0, initial cluster, 25 Anchor Keyframes, and section high-res
  useEffect(() => {
    // 1. Frame 0 low-res for instant paint
    requestLowResFrame(0, () => {
      drawFrame(0);
    });

    // 2. Frame 0 high-res for crystal-clear hero view
    requestHighResFrame(0, (heroHighRes) => {
      if (lastDrawnFrameIndexRef.current === 0) {
        const { width, height } = viewportDimsRef.current;
        if (width > 0 && height > 0 && canvasRef.current) {
          const ctx = canvasRef.current.getContext('2d');
          if (ctx) {
            renderImageToCanvas(heroHighRes, ctx, width, height, true);
            lastDrawnTypeRef.current = 'highres';
          }
        }
      }
    });

    // 3. Initial cluster (1..6) for smooth immediate scroll from hero
    for (let i = 1; i <= 6; i++) {
      requestLowResFrame(i);
    }

    // 4. Pre-seed the 25 Anchor Keyframes in 3 gentle micro-batches (~550KB total)
    // Batch 1 (frames 12..96) - start immediately
    const batch1 = ANCHOR_KEYFRAMES.slice(1, 9);
    // Batch 2 (frames 108..192) - 60ms delay
    const batch2 = ANCHOR_KEYFRAMES.slice(9, 17);
    // Batch 3 (frames 204..299) - 120ms delay
    const batch3 = ANCHOR_KEYFRAMES.slice(17);

    batch1.forEach((f) => requestLowResFrame(f));

    const t2 = window.setTimeout(() => {
      batch2.forEach((f) => requestLowResFrame(f));
    }, 60);

    const t3 = window.setTimeout(() => {
      batch3.forEach((f) => requestLowResFrame(f));
    }, 120);

    // 5. Pre-fetch section high-res frames for seamless resting sharpness
    const tSectionHighRes = window.setTimeout(() => {
      SECTION_HIGHRES_FRAMES.slice(1).forEach((sf) => {
        requestHighResFrame(sf);
      });
    }, 600);

    // 6. Background sequential filling during idle periods
    let idleTimer: number;
    let currentFillIdx = 7;

    const fillNext = () => {
      while (currentFillIdx < FRAME_COUNT && lowResCache.current.has(currentFillIdx)) {
        currentFillIdx++;
      }
      if (currentFillIdx >= FRAME_COUNT) return;

      requestLowResFrame(currentFillIdx);
      currentFillIdx++;

      idleTimer = window.setTimeout(fillNext, 90);
    };

    idleTimer = window.setTimeout(fillNext, 700);

    return () => {
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(tSectionHighRes);
      clearTimeout(idleTimer);
      if (restingTimerRef.current !== null) {
        clearTimeout(restingTimerRef.current);
      }
      if (scrubDebounceRef.current !== null) {
        clearTimeout(scrubDebounceRef.current);
      }
    };
  }, [ANCHOR_KEYFRAMES, SECTION_HIGHRES_FRAMES, drawFrame, requestHighResFrame, requestLowResFrame]);

  // Smooth scroll-driven animation loop with persistent critically-damped spring physics
  useEffect(() => {
    let animationFrameId: number | null = null;
    const targetPoseRef = { current: poseRef.current };

    const tick = () => {
      animationFrameId = null;
      const target = targetPoseRef.current;
      const current = poseRef.current;
      if (!target || !current) return;

      const isMobile = window.innerWidth < 768;
      // Critically damped organic spring factors: buttery continuous glide without stepped snapping
      const posLerp = isMobile ? 0.35 : 0.18;
      const scaleLerp = isMobile ? 0.35 : 0.14;
      const frameLerp = isMobile ? 0.85 : 0.40;

      const nextPose: AvatarPose = {
        frameProgress: isMobile
          ? target.frameProgress
          : lerp(current.frameProgress, target.frameProgress, frameLerp),
        x: lerp(current.x, target.x, posLerp),
        y: lerp(current.y, target.y, posLerp),
        scale: lerp(current.scale, target.scale, scaleLerp),
        opacity: lerp(current.opacity, target.opacity, posLerp),
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
        activeSection: state.activeSection,
        horizontalProgress: state.horizontalProgress,
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
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 1,
        pointerEvents: 'none',
        backgroundColor: 'var(--bg)',
        opacity: 0,
        contain: 'strict',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
          transform: 'translate3d(0, 0, 0) scale(1)',
          transformOrigin: 'center center',
          willChange: 'transform, opacity',
          filter: 'none',
        }}
      />
    </div>
  );
};

export default Scene;
