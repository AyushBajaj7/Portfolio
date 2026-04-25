import React, { useRef, useEffect, useMemo } from 'react';
import { useStore } from '../../store/useStore';

const FRAME_COUNT = 300;

function scaleImage(img: HTMLImageElement, ctx: CanvasRenderingContext2D) {
  const canvas = ctx.canvas;
  const isMobile = canvas.width < 1024;
  
  // Use 'cover' for desktop to fill background, 'contain' for mobile
  const hRatio = canvas.width / img.width;
  const vRatio = canvas.height / img.height;
  
  // On mobile, use cover to fill the screen, on desktop too
  const ratio = Math.max(hRatio, vRatio);
  
  let centerShift_x = (canvas.width - img.width * ratio) / 2;
  let centerShift_y = (canvas.height - img.height * ratio) / 2;

  // On desktop, shift the avatar to the right so it isn't hidden behind the text panel
  if (!isMobile) {
    centerShift_x = (canvas.width - img.width * ratio) * 0.8; // Shift towards right
  } else {
    // On mobile, anchor to right edge so avatar is visible
    centerShift_x = canvas.width - img.width * ratio;
    centerShift_y = (canvas.height - img.height * ratio) / 2;
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(
    img,
    0,
    0,
    img.width,
    img.height,
    centerShift_x,
    centerShift_y,
    img.width * ratio,
    img.height * ratio
  );
}

export const Scene: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scrollProgress = useStore((s) => s.scrollProgress);

  // Preload images into memory
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

  // Handle Canvas Sizing and Initial Render
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

  // Handle Scroll Driven Frame Updates
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

  return (
    <div 
      className="canvas-container" 
      style={{ 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        width: '100vw', 
        height: '100vh', 
        zIndex: 0, 
        pointerEvents: 'none', 
        backgroundColor: 'var(--bg)' 
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
