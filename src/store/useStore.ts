import { create } from 'zustand';

interface PortfolioState {
  activeSection: string;
  setActiveSection: (section: string) => void;
  cursorPosition: { x: number; y: number; px: number; py: number };
  setCursorPosition: (x: number, y: number) => void;
  isHoveringAvatar: boolean;
  setHoveringAvatar: (state: boolean) => void;
  scrollY: number;
  setScrollY: (y: number) => void;
  scrollProgress: number;
  setScrollProgress: (p: number) => void;
  theme: 'dark' | 'light';
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
