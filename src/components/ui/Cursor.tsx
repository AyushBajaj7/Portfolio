import React, { useEffect, useRef, useState } from 'react';
import { motion, useMotionValue } from 'framer-motion';
import { useStore } from '../../store/useStore';

type CursorState = 'default' | 'hover' | 'view' | 'text';
const cursorMedia = '(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)';

/** Pointer feedback is event-driven, with no idle animation or shared cursor state. */
export const Cursor: React.FC = () => {
  const [enabled, setEnabled] = useState(() => typeof window !== 'undefined' && window.matchMedia(cursorMedia).matches);
  const [cursorState, setCursorState] = useState<CursorState>('default');
  const currentStateRef = useRef<CursorState>('default');
  const cursorRef = useRef<HTMLDivElement>(null);
  const theme = useStore((state) => state.theme);
  const cursorX = useMotionValue(-100);
  const cursorY = useMotionValue(-100);

  useEffect(() => {
    const media = window.matchMedia(cursorMedia);
    const onChange = (event: MediaQueryListEvent) => setEnabled(event.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    let frame: number | null = null;
    let visible = false;
    let pointer = { x: -100, y: -100, target: null as EventTarget | null };

    const hide = () => {
      visible = false;
      if (cursorRef.current) cursorRef.current.style.opacity = '0';
      if (frame !== null) cancelAnimationFrame(frame);
      frame = null;
    };

    const update = () => {
      frame = null;
      if (!visible) {
        // Never animate across the page from a stale position after a scroll or tab change.
        visible = true;
        if (cursorRef.current) cursorRef.current.style.opacity = '1';
      }

      const target = pointer.target instanceof Element ? pointer.target : null;
      const isText = Boolean(target?.closest('input, textarea, [contenteditable="true"]'));
      const action = target?.closest('a, button, [role="button"]');
      const isLink = Boolean(action && !action.matches('[data-cursor="view"]'));
      const isView = !isLink && !isText && !target?.closest('[data-no-view-cursor]') && Boolean(target?.closest('[data-cursor="view"]'));
      const nextState: CursorState = isText ? 'text' : isLink ? 'hover' : isView ? 'view' : 'default';
      if (currentStateRef.current !== nextState) {
        currentStateRef.current = nextState;
        setCursorState(nextState);
      }
    };

    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return;
      cursorX.set(event.clientX);
      cursorY.set(event.clientY);
      pointer = { x: event.clientX, y: event.clientY, target: event.target };
      if (frame === null) frame = requestAnimationFrame(update);
    };
    const onVisibility = () => {
      if (document.hidden) hide();
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    // Capture also covers nested project rails without adding listeners to every card.
    document.addEventListener('scroll', hide, { passive: true, capture: true });
    document.addEventListener('pointerleave', hide);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('blur', hide);
    return () => {
      hide();
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('scroll', hide, true);
      document.removeEventListener('pointerleave', hide);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', hide);
    };
  }, [enabled, cursorX, cursorY]);

  if (!enabled) return null;

  const size = cursorState === 'view' ? 72 : cursorState === 'hover' ? 44 : cursorState === 'text' ? 2 : 14;
  const color = cursorState === 'view'
    ? theme === 'light' ? 'rgba(14, 116, 144, 0.16)' : 'rgba(138, 242, 255, 0.16)'
    : cursorState === 'hover'
      ? theme === 'light' ? 'rgba(4, 120, 87, 0.12)' : 'rgba(156, 255, 147, 0.14)'
      : theme === 'light' ? 'rgba(4, 120, 87, 0.65)' : 'rgba(156, 255, 147, 0.65)';

  return (
    <motion.div
      ref={cursorRef}
      aria-hidden="true"
      className="fixed left-0 top-0 z-[9999] pointer-events-none"
      style={{ x: cursorX, y: cursorY, opacity: 0 }}
    >
      <motion.div
        className="absolute -left-6 -top-6 h-12 w-12 rounded-full"
        animate={{
          scaleX: size / 48,
          scaleY: cursorState === 'text' ? 22 / 48 : size / 48,
          backgroundColor: color,
          borderRadius: cursorState === 'text' ? '0%' : '50%',
        }}
        transition={{ type: 'spring', mass: 0.4, stiffness: 450, damping: 28 }}
      />
      <motion.span
        className="absolute left-0 top-0 -translate-x-1/2 -translate-y-1/2 text-[9px] font-label font-bold tracking-widest text-on-surface"
        animate={{ opacity: cursorState === 'view' ? 1 : 0 }}
        transition={{ duration: 0.12 }}
      >
        VIEW
      </motion.span>
    </motion.div>
  );
};
