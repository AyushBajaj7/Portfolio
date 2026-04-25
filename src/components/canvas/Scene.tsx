import React, { useRef, useEffect, useMemo } from 'react';
import { useStore } from '../../store/useStore';

const FRAME_COUNT = 300;

function scaleImage(img: HTMLImageElement, ctx: CanvasRenderingContext2D) {
  const canvas = ctx.canvas;
  const isMobile = canvas.width < 1024;
  
  // Calculate base ratios using 'cover' to fill screen
  const hRatio = canvas.width / img.width;
  const vRatio = canvas.height / img.height;
  const ratio = Math.max(hRatio, vRatio);
  
  const drawWidth = img.width * ratio;
  const drawHeight = img.height * ratio;
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  
  // Position centered horizontally
  let centerShift_x = centerX - (drawWidth / 2);
  let centerShift_y = centerY - (drawHeight / 2);
  
  // On desktop (>=1024): shift slightly right to avoid text overlap
  if (!isMobile) {
    centerShift_x = (canvas.width * 0.6) - (drawWidth / 2);
  }
  
  // Clamp positions only if image would be completely off-canvas
  // On mobile: allow centered positioning
  // On desktop: keep the right-shift but prevent complete disappearance
  if (!isMobile) {
    // Desktop: clamp to keep at least 30% of image visible
    centerShift_x = Math.max(-drawWidth * 0.3, Math.min(centerShift_x, canvas.width - drawWidth * 0.7));
  }
  // Always ensure at least some portion is vertically visible
  centerShift_y = Math.max(-drawHeight * 0.3, Math.min(centerShift_y, canvas.height - drawHeight * 0.7));

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(
    img,
    0, 0, img.width, img.height,
    centerShift_x,
    centerShift_y,
    drawWidth,
    drawHeight
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
