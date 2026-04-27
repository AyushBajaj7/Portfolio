/**
 * @fileoverview Magnetic Cursor component - Boy-Coy style with multiple states.
 * Magnetic effect that snaps to elements with liquid distortion states.
 * @author Ayush Bajaj
 */

import React, { useEffect, useState } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';
import { useStore } from '../../store/useStore';

type CursorState = 'default' | 'hover' | 'view' | 'drag' | 'text';

export const Cursor: React.FC = () => {
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number } | null>(null);
  const [cursorState, setCursorState] = useState<CursorState>('default');
  const [cursorText, setCursorText] = useState('');
  const [isVisible, setIsVisible] = useState(false);
  const setCursorPosition = useStore((state) => state.setCursorPosition);
  
  const cursorX = useMotionValue(0);
  const cursorY = useMotionValue(0);
  
  const springConfig = { damping: 25, stiffness: 400 };
  const cursorXSpring = useSpring(cursorX, springConfig);
  const cursorYSpring = useSpring(cursorY, springConfig);

  useEffect(() => {
    const updateMousePosition = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
      setCursorPosition(e.clientX, e.clientY);
      cursorX.set(e.clientX);
      cursorY.set(e.clientY);
      if (!isVisible) setIsVisible(true);
    };

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      
      // Check for magnetic elements
      const magneticEl = target.closest('[data-magnetic]');
      const isProjectCard = target.closest('.project-card') || target.closest('[data-cursor="view"]');
      const isLink = target.tagName === 'A' || target.tagName === 'BUTTON' || target.closest('a') || target.closest('button');
      const isText = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
      
      if (isProjectCard) {
        setCursorState('view');
        setCursorText('VIEW');
      } else if (magneticEl || isLink) {
        setCursorState('hover');
        setCursorText('');
      } else if (isText) {
        setCursorState('text');
        setCursorText('');
      } else {
        setCursorState('default');
        setCursorText('');
      }
    };

    const handleMouseLeave = () => setIsVisible(false);
    const handleMouseEnter = () => setIsVisible(true);

    window.addEventListener('mousemove', updateMousePosition);
    window.addEventListener('mouseover', handleMouseOver);
    document.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('mouseenter', handleMouseEnter);

    return () => {
      window.removeEventListener('mousemove', updateMousePosition);
      window.removeEventListener('mouseover', handleMouseOver);
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('mouseenter', handleMouseEnter);
    };
  }, [cursorX, cursorY, isVisible, setCursorPosition]);

  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  if (isTouchDevice || !mousePosition) return null;

  const getCursorSize = () => {
    switch (cursorState) {
      case 'hover': return 60;
      case 'view': return 100;
      case 'text': return 3;
      default: return 20;
    }
  };

  const getCursorColor = () => {
    switch (cursorState) {
      case 'hover': return 'rgba(156, 255, 147, 0.2)';
      case 'view': return 'rgba(0, 242, 255, 0.3)';
      default: return 'rgba(156, 255, 147, 0.8)';
    }
  };

  const size = getCursorSize();

  return (
    <>
      {/* Main cursor dot with magnetic spring */}
      <motion.div
        className="fixed top-0 left-0 pointer-events-none z-[9999] mix-blend-difference"
        style={{
          x: cursorXSpring,
          y: cursorYSpring,
          marginLeft: -size / 2,
          marginTop: -size / 2,
        }}
        animate={{
          width: size,
          height: size,
          backgroundColor: cursorState === 'text' ? 'white' : getCursorColor(),
          borderRadius: cursorState === 'text' ? '0%' : '50%',
          opacity: isVisible ? 1 : 0,
        }}
        transition={{ type: 'spring', mass: 0.5, stiffness: 500, damping: 28 }}
      />
      
      {/* Cursor label for special states */}
      {(cursorState === 'view') && (
        <motion.div
          className="fixed top-0 left-0 pointer-events-none z-[10000]"
          style={{
            x: cursorXSpring,
            y: cursorYSpring,
            marginLeft: -size / 2,
            marginTop: -size / 2,
          }}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ 
            opacity: isVisible ? 1 : 0, 
            scale: 1,
          }}
          transition={{ duration: 0.15 }}
        >
          <span 
            className="absolute text-[10px] font-label tracking-widest text-white font-bold whitespace-nowrap"
            style={{
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
            }}
          >
            {cursorText}
          </span>
        </motion.div>
      )}
    </>
  );
};
