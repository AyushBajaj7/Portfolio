/**
 * @fileoverview Zustand store for global portfolio state management.
 * Provides centralized state for scroll progress, theme, cursor position, and section navigation.
 * @author Ayush Bajaj
 */

import { create } from 'zustand';

/** Global state interface for the portfolio application */
const getInitialTheme = (): 'dark' => {
  if (typeof window === 'undefined') return 'dark';

  try {
    window.localStorage.removeItem('portfolio-theme');
  } catch {
    // Storage can be disabled in private browsing.
  }

  return 'dark';
};

const applyThemeClass = () => {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.remove('light-theme');
};

getInitialTheme();
applyThemeClass();

interface PortfolioState {
  /** Currently active/visible section ID */
  activeSection: string;
  /** Set the active section ID */
  setActiveSection: (section: string) => void;
  /** Cursor position in screen and normalized coordinates */
  cursorPosition: { x: number; y: number; px: number; py: number };
  /** Update cursor position from screen coordinates */
  setCursorPosition: (x: number, y: number) => void;
  /** Whether cursor is hovering over the avatar */
  isHoveringAvatar: boolean;
  /** Set avatar hover state */
  setHoveringAvatar: (state: boolean) => void;
  /** Current vertical scroll position in pixels */
  scrollY: number;
  /** Update scroll position */
  setScrollY: (y: number) => void;
  /** Scroll progress as a percentage (0-1) */
  scrollProgress: number;
  /** Update scroll progress */
  setScrollProgress: (p: number) => void;
  /** Progress through the pinned horizontal projects segment */
  horizontalProgress: number;
  /** Update horizontal segment progress */
  setHorizontalProgress: (p: number) => void;
  /** Current scroll interaction mode */
  scrollMode: 'vertical' | 'horizontal';
  /** Update the current scroll interaction mode */
  setScrollMode: (mode: 'vertical' | 'horizontal') => void;
  /** Current theme: 'dark' or 'light' */
  theme: 'dark' | 'light';
  /** Toggle between dark and light themes */
  toggleTheme: () => void;
  /** Whether initial avatar frames are loaded */
  avatarReady: boolean;
  /** Set avatar ready state */
  setAvatarReady: (ready: boolean) => void;
  /** Current project view mode: 'bento' (grid matrix) or 'cinematic' (horizontal rail) */
  projectViewMode: 'bento' | 'cinematic';
  /** Set project view mode */
  setProjectViewMode: (mode: 'bento' | 'cinematic') => void;
}

export const useStore = create<PortfolioState>((set) => ({
  activeSection: 'hero',
  setActiveSection: (section) =>
    set((s) => (s.activeSection === section ? s : { activeSection: section })),
  cursorPosition: { x: 0, y: 0, px: 0, py: 0 },
  setCursorPosition: (x, y) =>
    set((s) => {
      if (Math.abs(s.cursorPosition.x - x) < 3 && Math.abs(s.cursorPosition.y - y) < 3) return s;
      return {
        cursorPosition: {
          x,
          y,
          px: (x / window.innerWidth) * 2 - 1,
          py: -(y / window.innerHeight) * 2 + 1,
        },
      };
    }),
  isHoveringAvatar: false,
  setHoveringAvatar: (state) =>
    set((s) => (s.isHoveringAvatar === state ? s : { isHoveringAvatar: state })),
  scrollY: 0,
  setScrollY: (y) =>
    set((s) => (s.scrollY === y ? s : { scrollY: y })),
  scrollProgress: 0,
  setScrollProgress: (p) =>
    set((s) => (Math.abs(s.scrollProgress - p) < 0.001 && p > 0 && p < 1 ? s : { scrollProgress: p })),
  horizontalProgress: 0,
  setHorizontalProgress: (p) =>
    set((s) => (Math.abs(s.horizontalProgress - p) < 0.001 && p > 0 && p < 1 ? s : { horizontalProgress: p })),
  scrollMode: 'vertical',
  setScrollMode: (mode) =>
    set((s) => (s.scrollMode === mode ? s : { scrollMode: mode })),
  theme: 'dark' as const,
  toggleTheme: () =>
    set(() => {
      applyThemeClass();
      return { theme: 'dark' as const };
    }),
  avatarReady: false,
  setAvatarReady: (ready) =>
    set((s) => (s.avatarReady === ready ? s : { avatarReady: ready })),
  projectViewMode: 'bento',
  setProjectViewMode: (mode) =>
    set((s) => (s.projectViewMode === mode ? s : { projectViewMode: mode })),
}));

if (typeof window !== 'undefined') {
  (window as unknown as { __useStore: typeof useStore }).__useStore = useStore;
}
