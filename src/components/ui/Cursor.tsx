/**
 * @fileoverview Magnetic Cursor component - Boy-Coy style with multiple states.
 * Magnetic effect that snaps to elements with liquid distortion states.
 * 
 * Performance: Uses refs + direct DOM manipulation for position updates
 * instead of React state. Only state changes (hover/view/text) trigger re-renders.
 * This keeps cursor movement at 60fps without any React overhead.
 * 
 * @author Ayush Bajaj
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';
import { useStore } from '../../store/useStore';

type CursorState = 'default' | 'hover' | 'view' | 'drag' | 'text';

export const Cursor: React.FC = () => {
  const [cursorState, setCursorState] = useState<CursorState>('default');
  const [cursorText, setCursorText] = useState('');
  const hasMouseRef = useRef(false);
  const isScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<number>(0);
  const setCursorPosition = useStore((state) => state.setCursorPosition);

  const cursorX = useMotionValue(-100);
  const cursorY = useMotionValue(-100);
  
  const springConfig = { damping: 25, stiffness: 400 };
  const cursorXSpring = useSpring(cursorX, springConfig);
  const cursorYSpring = useSpring(cursorY, springConfig);

  // Ref-based visibility — no re-renders for show/hide during movement
  const dotRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);

  const setVisible = useCallback((visible: boolean) => {
    if (dotRef.current) dotRef.current.style.opacity = visible ? '1' : '0';
    if (labelRef.current) labelRef.current.style.opacity = visible ? '1' : '0';
  }, []);

  useEffect(() => {
    // Touch device bail-out
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) return;

    const handleScrollStart = () => {
      isScrollingRef.current = true;
      setVisible(false);
      clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = window.setTimeout(() => {
        isScrollingRef.current = false;
        if (hasMouseRef.current) setVisible(true);
      }, 150);
    };

    const updateMousePosition = (e: MouseEvent) => {
      if (isScrollingRef.current) return;
      
      // Direct motion value set — zero React re-renders
      cursorX.set(e.clientX);
      cursorY.set(e.clientY);
      setCursorPosition(e.clientX, e.clientY);
      
      if (!hasMouseRef.current) {
        hasMouseRef.current = true;
        setVisible(true);
      }
    };

    const handleMouseOver = (e: MouseEvent) => {
      if (isScrollingRef.current) return;
      
      const target = e.target as HTMLElement;
      const isProjectCard = target.closest('.project-card') || target.closest('[data-cursor="view"]');
      const isLink = target.tagName === 'A' || target.tagName === 'BUTTON' || target.closest('a') || target.closest('button');
      const isText = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
      
      if (isProjectCard) {
        setCursorState('view');
        setCursorText('VIEW');
      } else if (isLink) {
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

    const handleMouseLeave = () => {
      hasMouseRef.current = false;
      setVisible(false);
    };
    const handleMouseEnter = () => {
      hasMouseRef.current = true;
      setVisible(true);
    };

    window.addEventListener('mousemove', updateMousePosition, { passive: true });
    window.addEventListener('mouseover', handleMouseOver, { passive: true });
    window.addEventListener('scroll', handleScrollStart, { passive: true });
    document.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('mouseenter', handleMouseEnter);

    // Also listen on the scroll container
    const scrollContainer = document.getElementById('scroll-container');
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScrollStart, { passive: true });
    }

    return () => {
      window.removeEventListener('mousemove', updateMousePosition);
      window.removeEventListener('mouseover', handleMouseOver);
      window.removeEventListener('scroll', handleScrollStart);
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('mouseenter', handleMouseEnter);
      if (scrollContainer) {
        scrollContainer.removeEventListener('scroll', handleScrollStart);
      }
      clearTimeout(scrollTimeoutRef.current);
    };
  }, [cursorX, cursorY, setCursorPosition, setVisible]);

  // Touch bail — don't render anything
  if (typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0)) {
    return null;
  }

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
        ref={dotRef}
        className="fixed top-0 left-0 pointer-events-none z-[9999] mix-blend-difference"
        style={{
          x: cursorXSpring,
          y: cursorYSpring,
          marginLeft: -size / 2,
          marginTop: -size / 2,
          opacity: 0,
          willChange: 'transform',
        }}
        animate={{
          width: size,
          height: size,
          backgroundColor: cursorState === 'text' ? 'white' : getCursorColor(),
          borderRadius: cursorState === 'text' ? '0%' : '50%',
        }}
        transition={{ type: 'spring', mass: 0.5, stiffness: 500, damping: 28 }}
      />
      
      {/* Cursor label for special states */}
      {(cursorState === 'view') && (
        <motion.div
          ref={labelRef}
          className="fixed top-0 left-0 pointer-events-none z-[10000]"
          style={{
            x: cursorXSpring,
            y: cursorYSpring,
            marginLeft: -size / 2,
            marginTop: -size / 2,
            opacity: 0,
            willChange: 'transform',
          }}
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
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
