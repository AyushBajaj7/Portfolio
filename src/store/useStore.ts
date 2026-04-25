/**
 * @fileoverview Zustand store for global portfolio state management.
 * Provides centralized state for scroll progress, theme, cursor position, and section navigation.
 * @author Ayush Bajaj
 */

import { create } from 'zustand';

/** Global state interface for the portfolio application */
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
  /** Current theme: 'dark' or 'light' */
  theme: 'dark' | 'light';
  /** Toggle between dark and light themes */
  toggleTheme: () => void;
}

export const useStore = create<PortfolioState>((set) => ({
  activeSection: 'hero',
  setActiveSection: (section) => set({ activeSection: section }),
  cursorPosition: { x: 0, y: 0, px: 0, py: 0 },
  setCursorPosition: (x, y) => set({
    cursorPosition: {
      x, y,
      px: (x / window.innerWidth) * 2 - 1,
      py: -(y / window.innerHeight) * 2 + 1,
    },
  }),
  isHoveringAvatar: false,
  setHoveringAvatar: (state) => set({ isHoveringAvatar: state }),
  scrollY: 0,
  setScrollY: (y) => set({ scrollY: y }),
  scrollProgress: 0,
  setScrollProgress: (p) => set({ scrollProgress: p }),
  theme: 'dark',
  toggleTheme: () => set((state) => {
    const newTheme = state.theme === 'dark' ? 'light' : 'dark';
    if (newTheme === 'light') {
      document.documentElement.classList.add('light-theme');
    } else {
      document.documentElement.classList.remove('light-theme');
    }
    return { theme: newTheme };
  }),
}));
