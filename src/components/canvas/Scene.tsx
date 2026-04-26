/**
 * @fileoverview Scene component - Renders scroll-driven avatar animation using HTML5 Canvas.
 * Preloads 300 PNG frames and displays them based on scroll progress for a 3D parallax effect.
 * @author Ayush Bajaj
 */

import React, { useRef, useEffect, useMemo } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useStore } from '../../store/useStore';

// Register GSAP plugin
gsap.registerPlugin(ScrollTrigger);

/**
 * Total number of avatar animation frames.
 */
const FRAME_COUNT = 300;

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
  const isLargeScreen = canvas.width >= 768;
  
  const horizontalRatio = canvas.width / img.width;
  const verticalRatio = canvas.height / img.height;
  
  // Large screens (≥768px): cover mode - fill screen, some cropping OK
  // Small screens (<768px): contain mode - fit full avatar within bounds
  const scaleRatio = isLargeScreen 
    ? Math.max(horizontalRatio, verticalRatio) 
    : Math.min(horizontalRatio, verticalRatio);
  
  const drawWidth = img.width * scaleRatio;
  const drawHeight = img.height * scaleRatio;
  
  // Center the image on canvas
  const centerShiftX = (canvas.width - drawWidth) / 2;
  const centerShiftY = (canvas.height - drawHeight) / 2;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
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
  const scrollProgress = useStore((s) => s.scrollProgress);

  /**
   * Preload all 300 avatar animation frames into memory.
   * Uses useMemo to prevent re-loading on re-renders.
   */
  const images = useMemo(() => {
    const baseUrl = import.meta.env.BASE_URL || '/';
    const imgs: HTMLImageElement[] = [];
    for (let i = 1; i <= FRAME_COUNT; i++) {
      const img = new Image();
      const num = i.toString().padStart(4, '0');
      img.src = `${baseUrl}frames/male${num}.png`;
      imgs.push(img);
    }
    return imgs;
  }, []);

  /**
   * Handle canvas sizing and initial render.
   * Sets up resize listener and renders the initial frame based on current scroll position.
   */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const onResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;

      const frameIndex = Math.min(
        FRAME_COUNT - 1,
        Math.max(0, Math.floor(useStore.getState().scrollProgress * FRAME_COUNT))
      );
      if (images[frameIndex] && images[frameIndex].complete) {
        scaleImage(images[frameIndex], ctx);
      }
    };

    window.addEventListener('resize', onResize);

    // Wait for first image to load before initial render to avoid blur
    if (images[0].complete) {
      onResize();
    } else {
      images[0].onload = onResize;
    }

    return () => window.removeEventListener('resize', onResize);
  }, [images]);

  /**
   * Handle scroll-driven frame updates.
   * Updates the displayed frame based on scroll progress from the Zustand store.
   */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const frameIndex = Math.min(
      FRAME_COUNT - 1,
      Math.max(0, Math.floor(scrollProgress * FRAME_COUNT))
    );

    if (images[frameIndex] && images[frameIndex].complete) {
      requestAnimationFrame(() => {
        scaleImage(images[frameIndex], ctx);
      });
    }
  }, [scrollProgress, images]);

  const theme = useStore((s) => s.theme);

  /**
   * GSAP ScrollTrigger parallax effect.
   * Moves the avatar canvas at 50% speed of scroll for depth effect.
   * Creates visual separation between foreground content and background avatar.
   */
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Only apply parallax on desktop (>= 768px)
    const isDesktop = window.innerWidth >= 768;
    if (!isDesktop) return;

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: document.body,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 1,
      },
    });

    // Parallax: move avatar slower than scroll (50% speed)
    tl.to(container, {
      y: '15%',
      ease: 'none',
    });

    return () => {
      tl.kill();
      ScrollTrigger.getAll().forEach(st => {
        if (st.vars.trigger === document.body) {
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
      }}
    >
      <canvas 
        ref={canvasRef} 
        style={{ 
          width: '100%', 
          height: '100%', 
          display: 'block',
          // Dark mode: natural avatar, no inversion. Light mode: no inversion either, just a subtle correction.
          filter: theme === 'dark' 
            ? 'contrast(1.1) brightness(0.95)' 
            : 'contrast(1.1) brightness(1.05) saturate(0.8)' 
        }} 
      />
    </div>
  );
};
