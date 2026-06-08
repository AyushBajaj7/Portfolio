/**
 * @fileoverview Navbar component - Fixed navigation with scroll detection and section highlighting.
 * Provides smooth scroll navigation, mobile menu, and active section indication.
 * @author Ayush Bajaj
 */

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { Download, Menu, Moon, Sun, X } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { useShallow } from 'zustand/react/shallow';

/**
 * MagneticButton component - Adds magnetic hover effect to buttons.
 * Button subtly attracts to cursor position on hover for interactive feel.
 */
const MagneticButton: React.FC<{ children: React.ReactNode; className?: string; onClick?: () => void }> = ({
  children,
  className = '',
  onClick,
}) => {
  const ref = useRef<HTMLButtonElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const distanceX = e.clientX - centerX;
    const distanceY = e.clientY - centerY;
    setPosition({ x: distanceX * 0.15, y: distanceY * 0.15 });
  };

  const handleMouseLeave = () => {
    setPosition({ x: 0, y: 0 });
  };

  return (
    <motion.button
      ref={ref}
      className={className}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      animate={{ x: position.x, y: position.y }}
      transition={{ type: 'spring', stiffness: 350, damping: 15, mass: 0.5 }}
    >
      {children}
    </motion.button>
  );
};

/**
 * Navigation bar component with top-edge reveal on desktop and stable mobile/tablet behavior.
 */
export const Navbar: React.FC = () => {
  const [scrolled, setScrolled] = useState(false);
  const [scrollTop, setScrollTop] = useState(0);
  const [scrollDirection, setScrollDirection] = useState<'up' | 'down'>('up');
  const lastScrollY = useRef(0);
  const [edgeReveal, setEdgeReveal] = useState(false);
  const [navHovered, setNavHovered] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  // Use useShallow to batch these into a single subscription so toggling theme or
  // changing activeSection doesn't cause an extra re-render when scrollProgress ticks.
  const { activeSection, theme, toggleTheme } = useStore(
    useShallow((s) => ({ activeSection: s.activeSection, theme: s.theme, toggleTheme: s.toggleTheme }))
  );
  // Progress bar is updated directly on the DOM element to avoid re-renders on every scroll tick.
  const progressBarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scrollContainer = document.getElementById('scroll-container');
    if (!scrollContainer) return;

    const onScroll = () => {
      const scrollContainer = document.getElementById('scroll-container');
      if (!scrollContainer) return;
      const useWindowScroll = window.innerWidth < 768;
      const currentScrollY = useWindowScroll ? window.scrollY : scrollContainer.scrollTop;
      
      if (currentScrollY > 24) {
        const newDir = currentScrollY > lastScrollY.current ? 'down' : 'up';
        setScrollDirection(prev => prev !== newDir ? newDir : prev);
      }
      lastScrollY.current = currentScrollY;
      
      setScrollTop(prev => {
        if ((prev > 96 && currentScrollY <= 96) || (prev <= 96 && currentScrollY > 96)) return currentScrollY;
        if (Math.abs(prev - currentScrollY) > 50) return currentScrollY;
        return prev;
      });
      setScrolled(prev => (currentScrollY > 24) !== prev ? (currentScrollY > 24) : prev);
    };

    const onResize = () => {
      if (window.innerWidth < 1024) {
        setEdgeReveal(false);
        setNavHovered(false);
      }
    };

    const onMouseMove = (event: MouseEvent) => {
      if (window.innerWidth < 1024) return;
      const isNearEdge = event.clientY <= 72;
      // Only call setState when the value actually changes
      setEdgeReveal(prev => prev !== isNearEdge ? isNearEdge : prev);
    };

    const onWindowLeave = () => {
      setEdgeReveal(false);
    };

    let attached = false;
    let pollTimer: number;

    const attachScroll = () => {
      const sc = document.getElementById('scroll-container');
      if (sc && !attached) {
        sc.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('scroll', onScroll, { passive: true });
        attached = true;
        onScroll();
        return true;
      }
      return false;
    };

    if (!attachScroll()) {
      pollTimer = window.setInterval(() => {
        if (attachScroll()) clearInterval(pollTimer);
      }, 100);
    }

    window.addEventListener('resize', onResize);
    window.addEventListener('mousemove', onMouseMove, { passive: true });
    window.addEventListener('mouseleave', onWindowLeave);
    onResize();

    return () => {
      clearInterval(pollTimer);
      const sc = document.getElementById('scroll-container');
      if (sc) sc.removeEventListener('scroll', onScroll);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseleave', onWindowLeave);
    };
  }, []);

  // Subscribe to scrollProgress imperatively so the progress bar updates without
  // triggering a React re-render on every scroll tick (runs at 60fps).
  useEffect(() => {
    const unsubscribe = useStore.subscribe((state) => {
      if (progressBarRef.current) {
        progressBarRef.current.style.width = `${Math.round(state.scrollProgress * 100)}%`;
      }
    });
    return unsubscribe;
  }, []);

  const scrollTo = (id: string) => {
    const element = document.getElementById(id);
    if (element) element.scrollIntoView({ behavior: 'smooth' });
    setMobileOpen(false);
  };

  const links = [
    { id: 'hero', label: 'Home' },
    { id: 'projects', label: 'Projects' },
    { id: 'about', label: 'About' },
    { id: 'skills', label: 'Skills' },
    { id: 'contact', label: 'Contact' },
  ];

  const shouldHide = scrollTop > 96 && scrollDirection === 'down' && !edgeReveal && (!navHovered || window.innerWidth < 1024) && !mobileOpen;

  return (
    <nav
      onMouseEnter={() => setNavHovered(true)}
      onMouseLeave={() => setNavHovered(false)}
      className={`fixed top-0 w-full transition-all duration-500 ${
        scrolled || mobileOpen ? 'glass-panel shadow-lg border-x-0 border-t-0 rounded-none' : 'bg-transparent'
      } ${shouldHide ? '-translate-y-[120%]' : 'translate-y-0'}`}
      style={{ zIndex: 60 }}
    >
      <div className="relative z-[65] max-w-screen-2xl mx-auto px-6 lg:px-12 bg-surface/98 backdrop-blur-md lg:bg-transparent lg:backdrop-blur-none">
        <div className="flex justify-between items-center h-16">

          {/* Logo */}
          <button
            className="text-lg font-display font-bold tracking-tight text-on-surface hover:text-primary-dim transition-colors duration-300"
            onClick={() => scrollTo('hero')}
          >
            Ayush Bajaj<span className="text-primary-dim">.</span>
          </button>

          {/* Desktop nav */}
          <div className="hidden lg:flex items-center gap-5">
            <LayoutGroup id="navbar-pill">
              <div className="flex items-center gap-0.5 rounded-xl border border-outline-variant bg-surface-container-high/40 p-1">
                {links.map((link) => (
                  <MagneticButton
                    key={link.id}
                    onClick={() => scrollTo(link.id)}
                    className={`relative px-3.5 py-1.5 rounded-lg text-sm font-body font-medium transition-colors duration-200 ${
                      activeSection === link.id
                        ? 'text-on-surface'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    {activeSection === link.id && (
                      <motion.span
                        layoutId="navbar-active-pill"
                        className="absolute inset-0 rounded-lg bg-primary/12 border border-primary/20"
                        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                      />
                    )}
                    <span className="relative z-10">{link.label}</span>
                  </MagneticButton>
                ))}
              </div>
            </LayoutGroup>

            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="relative flex h-8 w-14 items-center rounded-full border border-outline-variant bg-surface-container-high p-1 transition-all duration-300 hover:border-primary/40"
              aria-label="Toggle theme"
            >
              <div
                className={`flex h-6 w-6 items-center justify-center rounded-full shadow-md transition-all duration-300 ${
                  theme === 'light'
                    ? 'translate-x-6 bg-primary text-on-primary'
                    : 'translate-x-0 bg-surface-container-highest text-primary-dim'
                }`}
              >
                {theme === 'light' ? <Sun size={13} /> : <Moon size={13} />}
              </div>
            </button>

            {/* Resume link */}
            <a
              href={`${import.meta.env.BASE_URL}resume.pdf`}
              download
              className="hidden xl:flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/8 border border-primary/18 text-primary-dim text-xs font-bold tracking-wider uppercase hover:bg-primary hover:text-on-primary transition-all duration-300"
            >
              <Download size={15} />
              Resume
            </a>
          </div>

          {/* Mobile controls */}
          <div className="lg:hidden flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-outline-variant bg-surface-container-high/80 text-on-surface"
              aria-label="Toggle theme"
            >
              {theme === 'light' ? <Moon size={15} /> : <Sun size={15} />}
            </button>
            <button
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-outline-variant bg-surface-container-high/80 text-on-surface"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        {/* Scroll progress bar */}
        <div
          ref={progressBarRef}
          className="absolute bottom-0 left-0 h-[1.5px] bg-gradient-to-r from-primary via-tertiary to-primary-dim"
          style={{ width: '0%' }}
        />
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            className="absolute top-[63px] left-0 w-full flex flex-col bg-surface/98 backdrop-blur-md border-b border-outline-variant/30 lg:hidden shadow-xl"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
            style={{ overflow: 'hidden', zIndex: 64 }}
          >
            <div className="flex flex-col items-start px-6 py-5 gap-1 w-full">
              {links.map((link, i) => (
                <motion.button
                  key={link.id}
                  onClick={() => scrollTo(link.id)}
                  className={`w-full text-left rounded-xl px-4 py-3 text-xl font-display font-semibold transition-colors duration-200 ${
                    activeSection === link.id
                      ? 'text-primary bg-primary/8'
                      : 'text-on-surface hover:text-primary-dim hover:bg-surface-container-high/60'
                  }`}
                  initial={{ x: -16, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ duration: 0.24, delay: i * 0.04, ease: [0.22, 1, 0.36, 1] }}
                >
                  {link.label}
                </motion.button>
              ))}

              <div className="w-full h-px bg-outline-variant/30 my-3" />

              <a
                href={`${import.meta.env.BASE_URL}resume.pdf`}
                download
                className="flex items-center gap-2 h-12 px-4 rounded-xl bg-primary border border-primary/20 font-extrabold text-sm w-full justify-center hover:bg-primary-dim transition-all duration-300 mb-2"
                style={{ color: 'var(--on-primary)' }}
                aria-label="Download resume"
              >
                <Download size={16} />
                Download Resume
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};
