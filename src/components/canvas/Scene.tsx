/**
 * @fileoverview Scene component - Renders scroll-driven avatar animation using HTML5 Canvas.
 * Loads the current avatar PNG frame plus nearby frames based on scroll progress.
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

const getAvatarPose = ({
  activeSection,
  horizontalProgress,
  scrollMode,
  scrollProgress,
  viewportWidth,
}: {
  activeSection: string;
  horizontalProgress: number;
  scrollMode: 'vertical' | 'horizontal';
  scrollProgress: number;
  viewportWidth: number;
}): AvatarPose => {
  const overallProgress = clamp(scrollProgress);
  const tier = getViewportTier(viewportWidth);

  const scrollFrameProgress = overallProgress >= 0.995 ? 1 : overallProgress;

  if (scrollMode === 'horizontal') {
    if (tier === 'mobile') {
      return {
        frameProgress: scrollFrameProgress,
        x: lerp(18, 10, horizontalProgress),
        y: lerp(8, 12, horizontalProgress),
        scale: lerp(0.62, 0.68, horizontalProgress),
        opacity: 0.92,
      };
    }

    if (tier === 'tablet') {
      return {
        frameProgress: scrollFrameProgress,
        x: lerp(24, 14, horizontalProgress),
        y: lerp(2, 6, horizontalProgress),
        scale: lerp(0.68, 0.74, horizontalProgress),
        opacity: 0.9,
      };
    }

    return {
      frameProgress: scrollFrameProgress,
      x: lerp(28, 18, horizontalProgress),
      y: lerp(0, 4, horizontalProgress),
      scale: lerp(0.62, 0.68, horizontalProgress),
      opacity: 0.84,
    };
  }

  switch (activeSection) {
    case 'hero': {
      const heroProgress = clamp(overallProgress / 0.2);

      if (tier === 'mobile') {
        return {
          frameProgress: scrollFrameProgress,
          x: 0,
          y: lerp(10, 12, heroProgress),
          scale: lerp(0.68, 0.74, heroProgress),
          opacity: 0.9,
        };
      }

      if (tier === 'tablet') {
        return {
          frameProgress: scrollFrameProgress,
          x: 14,
          y: lerp(2, 4, heroProgress),
          scale: lerp(0.74, 0.8, heroProgress),
          opacity: 0.9,
        };
      }

      return {
        frameProgress: scrollFrameProgress,
        x: 16,
        y: lerp(0, 2, heroProgress),
        scale: lerp(0.7, 0.76, heroProgress),
        opacity: 0.86,
      };
    }
    case 'projects':
      if (tier === 'mobile') {
        return {
          frameProgress: scrollFrameProgress,
          x: 18,
          y: 12,
          scale: 0.64,
          opacity: 0.9,
        };
      }
      if (tier === 'tablet') {
        return {
          frameProgress: scrollFrameProgress,
          x: 20,
          y: 7,
          scale: 0.7,
          opacity: 0.88,
        };
      }
      return {
        frameProgress: scrollFrameProgress,
        x: 28,
        y: 5,
        scale: 0.64,
        opacity: 0.82,
      };
    case 'about':
      if (tier === 'mobile') {
        return {
          frameProgress: scrollFrameProgress,
          x: 20,
          y: 18,
          scale: 0.58,
          opacity: 0.9,
        };
      }
      if (tier === 'tablet') {
        return {
          frameProgress: scrollFrameProgress,
          x: 28,
          y: 14,
          scale: 0.66,
          opacity: 0.84,
        };
      }
      return {
        frameProgress: scrollFrameProgress,
        x: 36,
        y: 16,
        scale: 0.58,
        opacity: 0.8,
      };
    case 'skills':
      if (tier === 'mobile') {
        return {
          frameProgress: scrollFrameProgress,
          x: 20,
          y: 22,
          scale: 0.56,
          opacity: 0.9,
        };
      }
      if (tier === 'tablet') {
        return {
          frameProgress: scrollFrameProgress,
          x: 30,
          y: 18,
          scale: 0.6,
          opacity: 0.84,
        };
      }
      return {
        frameProgress: scrollFrameProgress,
        x: 40,
        y: 18,
        scale: 0.52,
        opacity: 0.78,
      };
    case 'contact':
      if (tier === 'mobile') {
        return {
          frameProgress: scrollFrameProgress,
          x: 18,
          y: 24,
          scale: 0.52,
          opacity: 0.9,
        };
      }
      if (tier === 'tablet') {
        return {
          frameProgress: scrollFrameProgress,
          x: 30,
          y: 20,
          scale: 0.58,
          opacity: 0.84,
        };
      }
      return {
        frameProgress: scrollFrameProgress,
        x: 42,
        y: 22,
        scale: 0.48,
        opacity: 0.78,
      };
    default:
      return {
        frameProgress: scrollFrameProgress,
        x: 0,
        y: 0,
        scale: 1,
        opacity: 1,
      };
  }
};

/**
 * Scales and draws an image on the canvas using either "cover" or "contain" mode
 * based on screen size. Cover fills the screen (allows cropping), contain fits
 * the entire image (no cropping) for smaller screens.
 * 
 * @param {HTMLImageElement} img - The image to draw
 * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
 */
function scaleImage(img: HTMLImageElement, ctx: CanvasRenderingContext2D) {
  const canvas = ctx.canvas;
  const width = canvas.clientWidth || window.innerWidth;
  const height = canvas.clientHeight || window.innerHeight;
  const isLargeScreen = width >= 768;
  
  const horizontalRatio = width / img.width;
  const verticalRatio = height / img.height;
  
  // Keep the full figure visible. Additional pose scale happens on the canvas element,
  // so drawing with a contain-biased ratio avoids oversized crops at 100% browser zoom.
  const containRatio = Math.min(horizontalRatio, verticalRatio);
  const coverRatio = Math.max(horizontalRatio, verticalRatio);
  const scaleRatio = isLargeScreen
    ? Math.min(coverRatio, containRatio * 1.18)
    : containRatio * 0.96;
  
  const drawWidth = img.width * scaleRatio;
  const drawHeight = img.height * scaleRatio;
  
  // Center the image on canvas
  const centerShiftX = (width - drawWidth) / 2;
  const centerShiftY = (height - drawHeight) / 2;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
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

/**
 * Scene component - Renders scroll-driven avatar animation using HTML5 Canvas.
 * Progressive loading strategy:
 *   Phase 1: Load all 300 low-res JPEGs (tiny, ~15KB each) for instant scroll response.
 *   Phase 2: After ALL low-res frames are loaded, fetch high-res PNG on demand when scroll settles.
 */
export const Scene: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Separate caches for low-res (JPEG) and high-res (PNG)
  const lowResCache = useRef(new Map<number, HTMLImageElement>());
  const highResCache = useRef(new Map<number, HTMLImageElement>());

  // Track pending network requests
  const lowResLoadedCount = useRef(0);
  const allLowResLoadedRef = useRef(false);

  const poseRef = useRef<AvatarPose | null>(null);
  const poseAnimationRef = useRef<number | null>(null);
  const frameIndexRef = useRef(-1);
  const desiredFrameIndexRef = useRef(-1);

  const scrollProgress = useStore((s) => s.scrollProgress);
  const horizontalProgress = useStore((s) => s.horizontalProgress);
  const scrollMode = useStore((s) => s.scrollMode);
  const activeSection = useStore((s) => s.activeSection);
  const theme = useStore((s) => s.theme);

  const getLowResSrc = useCallback((index: number) => {
    const baseUrl = import.meta.env.BASE_URL || '/';
    const frameNumber = String(index + 1).padStart(4, '0');
    return `${baseUrl}frames-lowres/male${frameNumber}.webp`;
  }, []);

  const getHighResSrc = useCallback((index: number) => {
    const baseUrl = import.meta.env.BASE_URL || '/';
    const frameNumber = String(index + 1).padStart(4, '0');
    return `${baseUrl}frames/male${frameNumber}.png`;
  }, []);

  // Get the best available image for a frame index (prefer high-res if cached)
  const getBestFrame = useCallback((index: number): HTMLImageElement | null => {
    const safeIndex = Math.min(FRAME_COUNT - 1, Math.max(0, index));
    const high = highResCache.current.get(safeIndex);
    if (high && high.complete && high.naturalWidth > 0) return high;
    const low = lowResCache.current.get(safeIndex);
    if (low && low.complete && low.naturalWidth > 0) return low;
    return low ?? null;
  }, []);

  // After all low-res are loaded, pre-download ALL high-res frames in the background.
  // Uses a small concurrency limit so it doesn't flood the network.
  const startHighResPreload = useCallback(() => {
    const CONCURRENCY = 4; // max parallel high-res downloads at a time
    let nextIndex = 0;

    const downloadNext = () => {
      if (nextIndex >= FRAME_COUNT) return;
      const index = nextIndex++;

      if (highResCache.current.has(index)) {
        downloadNext(); // already cached, skip
        return;
      }

      const img = new Image();
      img.decoding = 'async';
      img.src = getHighResSrc(index);

      img.addEventListener('load', () => {
        highResCache.current.set(index, img);
        // If this frame happens to be the one currently displayed, repaint it
        if (desiredFrameIndexRef.current === index) {
          const canvas = canvasRef.current;
          const ctx = canvas?.getContext('2d');
          if (canvas && ctx) scaleImage(img, ctx);
        }
        downloadNext(); // fetch next once this one finishes
      }, { once: true });

      img.addEventListener('error', () => {
        downloadNext(); // skip failed frames, continue
      }, { once: true });
    };

    // Start N parallel download chains
    for (let i = 0; i < CONCURRENCY; i++) {
      downloadNext();
    }
  }, [getHighResSrc]);

  // fetchHighRes is now just a no-op shim kept for the animate settled hook.
  // Since all high-res frames are pre-loaded, getBestFrame will already return
  // high-res automatically once the cache is populated.
  const fetchHighRes = useCallback((_index: number) => {
    // High-res is pre-loaded by startHighResPreload — nothing to do here.
  }, []);

  // Phase 1: Eagerly load ALL low-res frames on mount
  useEffect(() => {
    let loaded = 0;
    const total = FRAME_COUNT;

    for (let i = 0; i < total; i++) {
      const index = i;
      const img = new Image();
      img.decoding = 'async';

      img.addEventListener('load', () => {
        loaded++;
        lowResLoadedCount.current = loaded;
        if (loaded === total) {
          allLowResLoadedRef.current = true;
          // Phase 2: Once all low-res frames are done, start downloading ALL high-res in background
          startHighResPreload();
        }
      }, { once: true });

      img.src = getLowResSrc(index);
      lowResCache.current.set(index, img);
    }
  }, [getLowResSrc, startHighResPreload]);

  const drawFrame = useCallback((index: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const safeIndex = Math.min(FRAME_COUNT - 1, Math.max(0, index));
    desiredFrameIndexRef.current = safeIndex;

    const frame = getBestFrame(safeIndex);
    if (frame && frame.complete && frame.naturalWidth > 0) {
      scaleImage(frame, ctx);
      return;
    }

    // Frame not ready yet - wait for low-res to load
    const lowFrame = lowResCache.current.get(safeIndex);
    if (lowFrame && !lowFrame.complete) {
      lowFrame.addEventListener('load', () => {
        if (desiredFrameIndexRef.current === safeIndex) {
          scaleImage(lowFrame, ctx);
        }
      }, { once: true });
    }
  }, [getBestFrame]);

  const applyPose = useCallback((pose: AvatarPose) => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const frameIndex = Math.min(
      FRAME_COUNT - 1,
      Math.max(0, Math.floor(pose.frameProgress * (FRAME_COUNT - 1)))
    );

    // Always redraw on mobile (frameIndexRef may stale after scroll events)
    const isMobile = window.innerWidth < 768;
    if (frameIndex !== frameIndexRef.current || isMobile) {
      frameIndexRef.current = frameIndex;
      drawFrame(frameIndex);
    }

    const visibleOpacity = theme === 'light' ? Math.min(0.98, pose.opacity + 0.16) : pose.opacity;
    container.style.opacity = visibleOpacity.toFixed(3);
    canvas.style.transform = `translate3d(${pose.x.toFixed(2)}vw, ${pose.y.toFixed(2)}vh, 0) scale(${pose.scale.toFixed(3)})`;
    canvas.style.filter = 'none';
  }, [drawFrame, theme]);

  useEffect(() => {
    const syncCanvasSize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr = Math.min(window.devicePixelRatio || 1, window.innerWidth < 768 ? 1 : 1.35);
      canvas.width = Math.floor(window.innerWidth * dpr);
      // Use dvh on mobile so canvas matches visual viewport (excludes browser chrome)
      const vh = window.innerWidth < 768 ? window.visualViewport?.height ?? window.innerHeight : window.innerHeight;
      canvas.height = Math.floor(vh * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Reset frameIndexRef so the next applyPose call always redraws
      frameIndexRef.current = -1;

      const state = useStore.getState();
      const nextPose = getAvatarPose({
        activeSection: state.activeSection,
        horizontalProgress: state.horizontalProgress,
        scrollMode: state.scrollMode,
        scrollProgress: state.scrollProgress,
        viewportWidth: window.innerWidth,
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

  useEffect(() => {
    const targetPose = getAvatarPose({
      activeSection,
      horizontalProgress,
      scrollMode,
      scrollProgress,
      viewportWidth: window.innerWidth,
    });

    const isMobile = window.innerWidth < 768;

    // On mobile: skip lerp animation entirely — apply pose instantly to avoid frame skipping
    if (isMobile || window.matchMedia('(prefers-reduced-motion: reduce)').matches || poseRef.current === null) {
      poseRef.current = targetPose;
      applyPose(targetPose);
      return;
    }

    if (poseAnimationRef.current !== null) {
      window.cancelAnimationFrame(poseAnimationRef.current);
    }

    const animate = () => {
      const currentPose = poseRef.current ?? targetPose;
      const smoothing = scrollMode === 'horizontal' ? 0.18 : 0.12;
      const nextPose: AvatarPose = {
        frameProgress: lerp(currentPose.frameProgress, targetPose.frameProgress, smoothing),
        x: lerp(currentPose.x, targetPose.x, smoothing),
        y: lerp(currentPose.y, targetPose.y, smoothing),
        scale: lerp(currentPose.scale, targetPose.scale, smoothing),
        opacity: lerp(currentPose.opacity, targetPose.opacity, smoothing),
      };

      const settled =
        Math.abs(nextPose.frameProgress - targetPose.frameProgress) < 0.002 &&
        Math.abs(nextPose.x - targetPose.x) < 0.08 &&
        Math.abs(nextPose.y - targetPose.y) < 0.08 &&
        Math.abs(nextPose.scale - targetPose.scale) < 0.004 &&
        Math.abs(nextPose.opacity - targetPose.opacity) < 0.02;

      const resolvedPose = settled ? targetPose : nextPose;
      poseRef.current = resolvedPose;
      applyPose(resolvedPose);

      if (!settled) {
        poseAnimationRef.current = window.requestAnimationFrame(animate);
      } else {
        // Phase 2: fetch high-res only once animation settles AND all low-res are loaded
        fetchHighRes(frameIndexRef.current);
      }
    };

    poseAnimationRef.current = window.requestAnimationFrame(animate);

    return () => {
      if (poseAnimationRef.current !== null) {
        window.cancelAnimationFrame(poseAnimationRef.current);
      }
    };
  }, [activeSection, applyPose, horizontalProgress, scrollMode, scrollProgress, fetchHighRes]);

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
          filter: 'none'
        }} 
      />
    </div>
  );
};
