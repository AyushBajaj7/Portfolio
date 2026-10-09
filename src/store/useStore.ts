/** Discrete UI state only. Scroll pixels and avatar frames live in the shared timeline. */
import { create } from 'zustand';

interface PortfolioState {
  activeSection: string;
  setActiveSection: (section: string) => void;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  avatarReady: boolean;
  setAvatarReady: (ready: boolean) => void;
  projectViewMode: 'bento' | 'cinematic';
  setProjectViewMode: (mode: 'bento' | 'cinematic') => void;
}

export const useStore = create<PortfolioState>((set) => ({
  activeSection: 'hero',
  setActiveSection: (activeSection) => set(state => state.activeSection === activeSection ? state : { activeSection }),
  theme: 'dark',
  toggleTheme: () => set(state => {
    const theme = state.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.classList.toggle('light-theme', theme === 'light');
    return { theme };
  }),
  avatarReady: false,
  setAvatarReady: (avatarReady) => set(state => state.avatarReady === avatarReady ? state : { avatarReady }),
  projectViewMode: 'bento',
  setProjectViewMode: (projectViewMode) => set(state => state.projectViewMode === projectViewMode ? state : { projectViewMode }),
}));
