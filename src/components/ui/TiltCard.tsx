import React, { useRef, useCallback, useEffect } from 'react';

interface TiltCardProps {
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

export const TiltCard: React.FC<TiltCardProps> = ({
  children,
  className = '',
  maxTilt = 6,
  glareOpacity = 0.14,
  glareColor = '156, 255, 147',
  onClick,
  onKeyDown,
  tabIndex,
  role,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const glareRef = useRef<HTMLDivElement>(null);
  const rectRef = useRef<{ left: number; top: number; width: number; height: number } | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const isTouchRef = useRef(false);
  const isHoveredRef = useRef(false);

  useEffect(() => {
    isTouchRef.current =
      window.matchMedia('(pointer: coarse)').matches ||
      !window.matchMedia('(hover: hover)').matches;

    // Reset tilt on scroll to avoid GPU compositing contention
    const handleScroll = () => {
      if (isHoveredRef.current && cardRef.current) {
        cardRef.current.style.transform = 'perspective(900px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
        cardRef.current.style.willChange = 'auto';
        if (glareRef.current) glareRef.current.style.opacity = '0';
        rectRef.current = null;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);

  const handleMouseEnter = useCallback(() => {
    if (isTouchRef.current || !cardRef.current) return;
    isHoveredRef.current = true;
    cardRef.current.style.willChange = 'transform';
    const r = cardRef.current.getBoundingClientRect();
    rectRef.current = { left: r.left, top: r.top, width: r.width, height: r.height };
    cardRef.current.style.transition = 'transform 0.1s cubic-bezier(0.2, 0, 0, 1)';
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (isTouchRef.current || !isHoveredRef.current || !cardRef.current) return;
      cardRef.current.style.willChange = 'transform';

      // Lazy cache rect if not set
      if (!rectRef.current) {
        const r = cardRef.current.getBoundingClientRect();
        rectRef.current = { left: r.left, top: r.top, width: r.width, height: r.height };
      }

      const rect = rectRef.current;
      if (rect.width <= 0 || rect.height <= 0) return;

      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const percentX = Math.min(1, Math.max(0, mouseX / rect.width));
      const percentY = Math.min(1, Math.max(0, mouseY / rect.height));

      const rotateX = ((percentY - 0.5) * -maxTilt).toFixed(2);
      const rotateY = ((percentX - 0.5) * maxTilt).toFixed(2);

      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }

      rafIdRef.current = requestAnimationFrame(() => {
        if (!cardRef.current) return;
        cardRef.current.style.transform = `perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.01, 1.01, 1.01)`;
        if (glareRef.current) {
          glareRef.current.style.opacity = `${glareOpacity}`;
          glareRef.current.style.background = `radial-gradient(circle 380px at ${(percentX * 100).toFixed(1)}% ${(percentY * 100).toFixed(1)}%, rgba(${glareColor}, 0.22), transparent 70%)`;
        }
      });
    },
    [maxTilt, glareOpacity, glareColor]
  );

  const handleMouseLeave = useCallback(() => {
    if (isTouchRef.current || !cardRef.current) return;
    isHoveredRef.current = false;
    rectRef.current = null;
    cardRef.current.style.willChange = 'auto';
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    cardRef.current.style.transition = 'transform 0.4s cubic-bezier(0.2, 1, 0.36, 1)';
    cardRef.current.style.transform = 'perspective(900px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
    if (glareRef.current) {
      glareRef.current.style.opacity = '0';
    }
  }, []);

  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
    if (role === 'button' && event.key === ' ') event.preventDefault();
    onKeyDown?.(event);
  }, [onKeyDown, role]);

  return (
    <div
      ref={cardRef}
      role={role}
      tabIndex={tabIndex}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        transform: 'perspective(900px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)',
      }}
      className={`relative overflow-hidden ${className}`}
    >
      {/* Specular Holographic Glare Layer - Updated directly via ref */}
      <div
        ref={glareRef}
        className="pointer-events-none absolute -inset-px rounded-[inherit] transition-opacity duration-300 z-10 opacity-0"
        aria-hidden="true"
      />
      {children}
    </div>
  );
};
