import React, { useRef, useState, useCallback, useEffect } from 'react';

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
  const [transform, setTransform] = useState('');
  const [glarePosition, setGlarePosition] = useState<{ x: number; y: number; opacity: number }>({
    x: 50,
    y: 50,
    opacity: 0,
  });
  const [isHovered, setIsHovered] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    // Detect touch / non-hover screens to disable tilt physics and conserve resources
    const hasTouch = window.matchMedia('(pointer: coarse)').matches || !window.matchMedia('(hover: hover)').matches;
    setIsTouchDevice(hasTouch);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (isTouchDevice || !cardRef.current) return;

    const rect = cardRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const percentX = mouseX / width;
    const percentY = mouseY / height;

    // Calculate rotation (-maxTilt to +maxTilt)
    const rotateX = ((percentY - 0.5) * -maxTilt).toFixed(2);
    const rotateY = ((percentX - 0.5) * maxTilt).toFixed(2);

    setTransform(`perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.012, 1.012, 1.012)`);
    setGlarePosition({
      x: percentX * 100,
      y: percentY * 100,
      opacity: glareOpacity,
    });
  }, [isTouchDevice, maxTilt, glareOpacity]);

  const handleMouseEnter = useCallback(() => {
    if (isTouchDevice) return;
    setIsHovered(true);
  }, [isTouchDevice]);

  const handleMouseLeave = useCallback(() => {
    if (isTouchDevice) return;
    setIsHovered(false);
    setTransform('perspective(900px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)');
    setGlarePosition((prev) => ({ ...prev, opacity: 0 }));
  }, [isTouchDevice]);

  return (
    <div
      ref={cardRef}
      role={role}
      tabIndex={tabIndex}
      onClick={onClick}
      onKeyDown={onKeyDown}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        transform: transform || undefined,
        transformStyle: 'preserve-3d',
        transition: isHovered
          ? 'transform 0.1s cubic-bezier(0.2, 0, 0, 1)'
          : 'transform 0.45s cubic-bezier(0.2, 1, 0.36, 1)',
      }}
      className={`relative overflow-hidden ${className}`}
    >
      {/* Dynamic Specular Holographic Glare Layer */}
      {!isTouchDevice && (
        <div
          className="pointer-events-none absolute -inset-px rounded-[inherit] transition-opacity duration-300 z-10"
          style={{
            opacity: glarePosition.opacity,
            background: `radial-gradient(circle 380px at ${glarePosition.x}% ${glarePosition.y}%, rgba(${glareColor}, 0.22), transparent 70%)`,
          }}
          aria-hidden="true"
        />
      )}
      {children}
    </div>
  );
};
