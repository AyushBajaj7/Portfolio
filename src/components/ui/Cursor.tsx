import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '../../store/useStore';

export const Cursor: React.FC = () => {
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number } | null>(null);
  const isHoveringAvatar = useStore((state) => state.isHoveringAvatar);
  const setCursorPosition = useStore((state) => state.setCursorPosition);

  useEffect(() => {
    const updateMousePosition = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
      setCursorPosition(e.clientX, e.clientY);
    };

    window.addEventListener('mousemove', updateMousePosition);
    return () => {
      window.removeEventListener('mousemove', updateMousePosition);
    };
  }, []);

  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  if (isTouchDevice || !mousePosition) return null;

  return (
    <motion.div
      className={`custom-cursor ${isHoveringAvatar ? 'hovering' : ''}`}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        x: mousePosition.x - 10,
        y: mousePosition.y - 10,
      }}
      animate={{
        scale: isHoveringAvatar ? 2.5 : 1,
      }}
      transition={{ type: 'spring', mass: 0.2, stiffness: 700, damping: 35 }}
    />
  );
};
