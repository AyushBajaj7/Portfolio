/**
 * @fileoverview Scene component - Renders scroll-driven avatar animation using HTML5 Canvas.
 * Preloads 300 PNG frames and displays them based on scroll progress for a 3D parallax effect.
 * @author Ayush Bajaj
 */

import React, { useCallback, useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useStore } from '../../store/useStore';

// Register GSAP plugin
gsap.registerPlugin(ScrollTrigger);

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

  if (scrollMode === 'horizontal') {
    if (tier === 'mobile') {
      return {
        frameProgress: lerp(0.2, 0.4, horizontalProgress),
        x: lerp(18, 10, horizontalProgress),
        y: lerp(8, 12, horizontalProgress),
        scale: lerp(0.62, 0.68, horizontalProgress),
        opacity: 0.88,
      };
    }

    if (tier === 'tablet') {
      return {
        frameProgress: lerp(0.2, 0.42, horizontalProgress),
        x: lerp(26, 16, horizontalProgress),
        y: lerp(2, 6, horizontalProgress),
        scale: lerp(0.72, 0.8, horizontalProgress),
        opacity: 0.88,
      };
    }

    return {
      frameProgress: lerp(0.2, 0.45, horizontalProgress),
      x: lerp(34, 18, horizontalProgress),
      y: lerp(-4, 2, horizontalProgress),
      scale: lerp(0.76, 0.86, horizontalProgress),
      opacity: 0.88,
    };
  }

  switch (activeSection) {
    case 'hero': {
      const heroProgress = clamp(overallProgress / 0.2);

      if (tier === 'mobile') {
        return {
          frameProgress: lerp(0, 0.25, heroProgress),
          x: 0,
          y: lerp(10, 12, heroProgress),
          scale: lerp(0.68, 0.74, heroProgress),
          opacity: 0.88,
        };
      }

      if (tier === 'tablet') {
        return {
          frameProgress: lerp(0, 0.25, heroProgress),
          x: 16,
          y: lerp(2, 4, heroProgress),
          scale: lerp(0.82, 0.88, heroProgress),
          opacity: 0.88,
        };
      }

      return {
        frameProgress: lerp(0, 0.25, heroProgress),
        x: 12,
        y: lerp(-2, 1, heroProgress),
        scale: lerp(0.96, 1.02, heroProgress),
        opacity: 0.88,
      };
    }
    case 'projects':
      if (tier === 'mobile') {
        return {
          frameProgress: 0.4,
          x: 18,
          y: 12,
          scale: 0.64,
          opacity: 0.88,
        };
      }
      if (tier === 'tablet') {
        return {
          frameProgress: 0.42,
          x: 22,
          y: 7,
          scale: 0.76,
          opacity: 0.88,
        };
      }
      return {
        frameProgress: 0.4,
        x: 28,
        y: -1,
        scale: 0.82,
        opacity: 0.88,
      };
    case 'about':
      if (tier === 'mobile') {
        return {
          frameProgress: 0.6,
          x: 20,
          y: 18,
          scale: 0.58,
          opacity: 0.88,
        };
      }
      if (tier === 'tablet') {
        return {
          frameProgress: 0.62,
          x: 28,
          y: 14,
          scale: 0.66,
          opacity: 0.88,
        };
      }
      return {
        frameProgress: 0.6,
        x: 34,
        y: 7,
        scale: 0.76,
        opacity: 0.88,
      };
    case 'skills':
      if (tier === 'mobile') {
        return {
          frameProgress: 0.8,
          x: 20,
          y: 22,
          scale: 0.56,
          opacity: 0.88,
        };
      }
      if (tier === 'tablet') {
        return {
          frameProgress: 0.82,
          x: 30,
          y: 18,
          scale: 0.6,
          opacity: 0.88,
        };
      }
      return {
        frameProgress: 0.8,
        x: 36,
        y: 13,
        scale: 0.68,
        opacity: 0.88,
      };
    case 'contact':
      if (tier === 'mobile') {
        return {
          frameProgress: 1.0,
          x: 18,
          y: 24,
          scale: 0.52,
          opacity: 0.88,
        };
      }
      if (tier === 'tablet') {
        return {
          frameProgress: 1.0,
          x: 30,
          y: 20,
          scale: 0.58,
          opacity: 0.88,
        };
      }
      return {
        frameProgress: 1.0,
        x: 35,
        y: 16,
        scale: 0.62,
        opacity: 0.88,
      };
    default:
      return {
        frameProgress: overallProgress,
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
  
  // Large screens: cover mode - fill screen, some cropping OK
  // Small screens (<768px): contain mode - fit full avatar within bounds
  const scaleRatio = isLargeScreen 
    ? Math.max(horizontalRatio, verticalRatio) 
    : Math.min(horizontalRatio, verticalRatio);
  
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
 * Preloads 300 PNG frames and displays them based on scroll progress for a 3D parallax effect.
 */
export const Scene: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageCache = useRef(new Map<number, HTMLImageElement>());
  const poseRef = useRef<AvatarPose | null>(null);
  const poseAnimationRef = useRef<number | null>(null);
  const frameIndexRef = useRef(-1);
  const scrollProgress = useStore((s) => s.scrollProgress);
  const horizontalProgress = useStore((s) => s.horizontalProgress);
  const scrollMode = useStore((s) => s.scrollMode);
  const activeSection = useStore((s) => s.activeSection);

  const getFrameSrc = useCallback((index: number) => {
    const baseUrl = import.meta.env.BASE_URL || '/';
    const frameNumber = String(index + 1).padStart(4, '0');
    return `${baseUrl}frames/male${frameNumber}.png`;
  }, []);

  const getFrame = useCallback((index: number) => {
    const safeIndex = Math.min(FRAME_COUNT - 1, Math.max(0, index));
    const cached = imageCache.current.get(safeIndex);
    if (cached) return cached;

    const img = new Image();
    img.decoding = 'async';
    img.src = getFrameSrc(safeIndex);
    imageCache.current.set(safeIndex, img);
    return img;
  }, [getFrameSrc]);

  const preloadAround = useCallback((index: number) => {
    const offsets = [-3, -2, -1, 1, 2, 3, 6, 12];
    offsets.forEach((offset) => {
      const nextIndex = index + offset;
      if (nextIndex >= 0 && nextIndex < FRAME_COUNT) {
        getFrame(nextIndex);
      }
    });
  }, [getFrame]);

  const drawFrame = useCallback((index: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const frame = getFrame(index);
    if (frame.complete && frame.naturalWidth > 0) {
      scaleImage(frame, ctx);
      preloadAround(index);
      return;
    }

    frame.addEventListener(
      'load',
      () => {
        scaleImage(frame, ctx);
        preloadAround(index);
      },
      { once: true }
    );
  }, [getFrame, preloadAround]);

  useEffect(() => {
    for (let i = 0; i < Math.min(50, FRAME_COUNT); i++) {
      const img = new Image();
      img.decoding = 'async';
      img.src = getFrameSrc(i);
      imageCache.current.set(i, img);
    }
  }, [getFrameSrc]);

  const applyPose = useCallback((pose: AvatarPose) => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const frameIndex = Math.min(
      FRAME_COUNT - 1,
      Math.max(0, Math.floor(pose.frameProgress * (FRAME_COUNT - 1)))
    );

    if (frameIndex !== frameIndexRef.current) {
      frameIndexRef.current = frameIndex;
      drawFrame(frameIndex);
    }

    container.style.opacity = pose.opacity.toFixed(3);
    canvas.style.transform = `translate3d(${pose.x.toFixed(2)}vw, ${pose.y.toFixed(2)}vh, 0) scale(${pose.scale.toFixed(3)})`;
  }, [drawFrame]);

  useEffect(() => {
    const syncCanvasSize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

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
    syncCanvasSize();

    return () => {
      window.removeEventListener('resize', syncCanvasSize);
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

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || poseRef.current === null) {
      poseRef.current = targetPose;
      applyPose(targetPose);
      return;
    }

    if (poseAnimationRef.current !== null) {
      window.cancelAnimationFrame(poseAnimationRef.current);
    }

    const animate = () => {
      const currentPose = poseRef.current ?? targetPose;
      // Higher smoothing = silkier transitions (boy-coy style exponential decay)
      // Horizontal mode needs faster response; vertical gets buttery-smooth 0.16
      const smoothing = scrollMode === 'horizontal' ? 0.22 : 0.16;
      const nextPose: AvatarPose = {
        frameProgress: lerp(currentPose.frameProgress, targetPose.frameProgress, smoothing),
        x: lerp(currentPose.x, targetPose.x, smoothing),
        y: lerp(currentPose.y, targetPose.y, smoothing),
        scale: lerp(currentPose.scale, targetPose.scale, smoothing),
        opacity: lerp(currentPose.opacity, targetPose.opacity, smoothing),
      };

      const settled =
        Math.abs(nextPose.frameProgress - targetPose.frameProgress) < 0.004 &&
        Math.abs(nextPose.x - targetPose.x) < 0.08 &&
        Math.abs(nextPose.y - targetPose.y) < 0.08 &&
        Math.abs(nextPose.scale - targetPose.scale) < 0.004 &&
        Math.abs(nextPose.opacity - targetPose.opacity) < 0.02;

      const resolvedPose = settled ? targetPose : nextPose;
      poseRef.current = resolvedPose;
      applyPose(resolvedPose);

      if (!settled) {
        poseAnimationRef.current = window.requestAnimationFrame(animate);
      }
    };

    poseAnimationRef.current = window.requestAnimationFrame(animate);

    return () => {
      if (poseAnimationRef.current !== null) {
        window.cancelAnimationFrame(poseAnimationRef.current);
      }
    };
  }, [activeSection, applyPose, horizontalProgress, scrollMode, scrollProgress]);

  /**
   * GSAP ScrollTrigger parallax effect.
   * Moves the avatar canvas at 50% speed of scroll for depth effect.
   * Creates visual separation between foreground content and background avatar.
   */
  useEffect(() => {
    const container = containerRef.current;
    const scrollContainer = document.getElementById('scroll-container');
    if (!container || !scrollContainer) return;

    // Only apply parallax on larger layouts where the avatar has room to move.
    const isDesktop = window.innerWidth >= 1024;
    if (!isDesktop) return;

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: scrollContainer,
        scroller: scrollContainer,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 1,
      },
    });

    // Parallax: move avatar slower than scroll (50% speed)
    tl.to(container, {
      y: '8%',
      ease: 'none',
    });

    return () => {
      tl.kill();
      ScrollTrigger.getAll().forEach(st => {
        if (st.vars.trigger === scrollContainer) {
          st.kill();
        }
      });
    };
  }, []);

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
        zIndex: 0,
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
