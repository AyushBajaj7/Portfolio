import React, { useRef, useCallback, useEffect } from 'react';

interface TiltCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  maxTilt?: number;
  glareOpacity?: number;
  glareColor?: string;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLDivElement>) => void;
  tabIndex?: number;
  role?: string;
}

const tiltMedia = '(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)';

/** Pointer-only tilt. A card owns work and scroll listeners only while hovered. */
export const TiltCard: React.FC<TiltCardProps> = ({
  children,
  className = '',
  maxTilt = 4,
  glareOpacity = 0.14,
  glareColor = '156, 255, 147',
  onClick,
  onKeyDown,
  tabIndex,
  role,
  ...attributes
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const glareRef = useRef<HTMLDivElement>(null);
  const rectRef = useRef<DOMRect | null>(null);
  const pointerRef = useRef({ x: 0, y: 0 });
  const frameRef = useRef<number | null>(null);
  const mediaRef = useRef<MediaQueryList | null>(null);
  const hoveredRef = useRef(false);

  const reset = useCallback(function resetTilt() {
    hoveredRef.current = false;
    rectRef.current = null;
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    if (cardRef.current) {
      cardRef.current.style.transition = 'transform 0.28s cubic-bezier(0.2, 1, 0.36, 1)';
      cardRef.current.style.transform = '';
      cardRef.current.style.willChange = 'auto';
    }
    if (glareRef.current) {
      glareRef.current.style.opacity = '0';
      glareRef.current.style.willChange = 'auto';
    }
    document.removeEventListener('scroll', resetTilt, true);
    window.removeEventListener('resize', resetTilt);
    window.removeEventListener('blur', resetTilt);
    mediaRef.current?.removeEventListener('change', resetTilt);
    mediaRef.current = null;
  }, []);

  useEffect(() => reset, [reset]);

  const handleMouseEnter = useCallback(() => {
    const media = window.matchMedia(tiltMedia);
    if (!media.matches || !cardRef.current) return;
    hoveredRef.current = true;
    // Read once before applying any transform, then invalidate on any scroll or resize.
    rectRef.current = cardRef.current.getBoundingClientRect();
    cardRef.current.style.willChange = 'transform';
    cardRef.current.style.transition = 'transform 0.1s ease-out';
    if (glareRef.current) glareRef.current.style.willChange = 'transform, opacity';
    mediaRef.current = media;
    media.addEventListener('change', reset);
    document.addEventListener('scroll', reset, { passive: true, capture: true });
    window.addEventListener('resize', reset, { passive: true });
    window.addEventListener('blur', reset);
  }, [reset]);

  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (!hoveredRef.current || !rectRef.current || !cardRef.current) return;
    pointerRef.current = { x: event.clientX, y: event.clientY };
    if (frameRef.current !== null) return;
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null;
      const rect = rectRef.current;
      const card = cardRef.current;
      if (!hoveredRef.current || !rect || !card || rect.width <= 0 || rect.height <= 0) return;
      const x = Math.max(0, Math.min(rect.width, pointerRef.current.x - rect.left));
      const y = Math.max(0, Math.min(rect.height, pointerRef.current.y - rect.top));
      const rotateX = (0.5 - y / rect.height) * maxTilt;
      const rotateY = (x / rect.width - 0.5) * maxTilt;
      card.style.transform = `perspective(900px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale3d(1.005, 1.005, 1.005)`;
      if (glareRef.current) {
        glareRef.current.style.opacity = String(glareOpacity);
        // Move a reusable gradient texture; don't rebuild a radial gradient on every move.
        glareRef.current.style.transform = `translate3d(${(x - 190).toFixed(1)}px, ${(y - 190).toFixed(1)}px, 0)`;
      }
    });
  }, [maxTilt, glareOpacity]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
    // Nested buttons and demo controls keep their native keyboard behavior.
    if (event.target !== event.currentTarget) return;
    if (role === 'button' && event.key === ' ') event.preventDefault();
    if (onKeyDown) onKeyDown(event);
    else if (role === 'button' && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      event.currentTarget.click();
    }
  }, [onKeyDown, role]);

  return (
    <div
      {...attributes}
      ref={cardRef}
      role={role}
      tabIndex={tabIndex}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={reset}
      className={`relative overflow-hidden ${className}`}
    >
      <div
        ref={glareRef}
        className="pointer-events-none absolute left-0 top-0 z-10 h-[380px] w-[380px] rounded-full opacity-0 transition-opacity duration-200"
        style={{ background: `radial-gradient(circle closest-side, rgba(${glareColor}, 0.22), transparent 100%)` }}
        aria-hidden="true"
      />
      {children}
    </div>
  );
};
