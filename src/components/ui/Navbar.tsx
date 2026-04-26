/**
 * @fileoverview Navbar component - Fixed navigation with scroll detection and section highlighting.
 * Provides smooth scroll navigation, mobile menu, and active section indication.
 * @author Ayush Bajaj
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '../../store/useStore';

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

    // Magnetic pull strength (15% of distance)
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
 * Navigation bar component with scroll effects and mobile responsive menu.
 * @returns {React.ReactElement} The navigation component
 */
export const Navbar: React.FC = () => {
  /**
   * scrolled: Tracks if user has scrolled past 40px threshold.
   * When true, navbar shows glass-morphism background. When false, transparent.
   */
  const [scrolled, setScrolled] = useState(false);
  /**
   * hidden: Tracks if navbar should be hidden (scroll down) or visible (scroll up).
   * Implements hide-on-scroll-down, show-on-scroll-up behavior.
   */
  const [hidden, setHidden] = useState(false);
  /**
   * lastScrollY: Stores previous scroll position to determine scroll direction.
   */
  const [lastScrollY, setLastScrollY] = useState(0);
  
  /** mobileOpen: Controls mobile menu visibility with slide-down animation */
  const [mobileOpen, setMobileOpen] = useState(false);
  
  /** activeSection: Current visible section from Zustand store for nav highlighting */
  const activeSection = useStore((s) => s.activeSection);

  /**
   * Detect scroll position and direction to toggle navbar background and visibility.
   * - Background: Changes to glass-morphism after 40px scroll
   * - Visibility: Hides when scrolling down, shows when scrolling up
   */
  useEffect(() => {
    const scrollContainer = document.getElementById('scroll-container');
    if (!scrollContainer) return;

    const onScroll = () => {
      const currentScrollY = scrollContainer.scrollTop;

      // Background change threshold
      setScrolled(currentScrollY > 40);

      // Hide/show based on scroll direction (only after scrolling past 100px)
      if (currentScrollY > 100) {
        if (currentScrollY > lastScrollY) {
          setHidden(true); // Scrolling down - hide
        } else {
          setHidden(false); // Scrolling up - show
        }
      } else {
        setHidden(false); // Always show at top
      }

      setLastScrollY(currentScrollY);
    };

    scrollContainer.addEventListener('scroll', onScroll, { passive: true });

    return () => scrollContainer.removeEventListener('scroll', onScroll);
  }, [lastScrollY]);

  /**
   * Smooth scroll to a section by ID and close mobile menu.
   * @param {string} id - The target section ID
   */
  const scrollTo = (id: string) => {
    const element = document.getElementById(id);
    if (element) element.scrollIntoView({ behavior: 'smooth' });
    setMobileOpen(false);
  };

  /** Navigation links mapping section IDs to display labels */
  const links = [
    { id: 'hero', label: 'Home' },
    { id: 'projects', label: 'Projects' },
    { id: 'about', label: 'About' },
    { id: 'skills', label: 'Skills' },
    { id: 'contact', label: 'Contact' },
  ];

  return (
    <nav
      className={`fixed top-0 w-full z-50 transition-all duration-500 ${
        scrolled
          ? 'glass-panel shadow-lg border-x-0 border-t-0 rounded-none'  // Glass effect after scroll
          : 'bg-transparent'  // Fully transparent at top of page
      } ${
        hidden ? '-translate-y-full' : 'translate-y-0'  // Hide on scroll down, show on scroll up
      }`}
    >
      <div className="max-w-screen-2xl mx-auto px-6 lg:px-12">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <button
            className="text-lg font-display font-bold tracking-tight text-on-surface hover:text-primary-dim transition-colors duration-300"
            onClick={() => scrollTo('hero')}
          >
            Ayush Bajaj<span className="text-primary-dim">.</span>
          </button>

          <div className="hidden md:flex items-center gap-6">
            <div className="flex items-center gap-1">
              {links.map((link) => (
                <MagneticButton
                  key={link.id}
                  onClick={() => scrollTo(link.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-body font-medium transition-all duration-300 ${
                    activeSection === link.id
                      ? 'text-primary-dim bg-primary/10'
                      : 'text-on-surface-variant hover:text-on-surface hover:bg-on-surface/5'
                  }`}
                >
                  {link.label}
                </MagneticButton>
              ))}
            </div>

            {/* Theme Toggle Switch */}
            <button
              onClick={() => useStore.getState().toggleTheme()}
              className="relative w-14 h-7 rounded-full bg-surface-container-high border border-outline-variant/30 flex items-center p-1 group transition-all duration-500 hover:border-primary/40"
              aria-label="Toggle theme"
            >
              <div className={`w-5 h-5 rounded-full shadow-lg transform transition-all duration-500 flex items-center justify-center ${
                useStore((s) => s.theme) === 'light' 
                  ? 'translate-x-7 bg-primary text-on-primary' 
                  : 'translate-x-0 bg-surface-container-highest text-primary-dim'
              }`}>
                <span className="material-symbols-outlined text-[14px]">
                  {useStore((s) => s.theme) === 'light' ? 'light_mode' : 'dark_mode'}
                </span>
              </div>
            </button>

            {/* Resume Button in Navbar */}
            <a
              href="resume.pdf"
              download
              className="hidden lg:flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/8 border border-primary/20 text-primary-dim text-xs font-bold tracking-wider uppercase hover:bg-primary hover:text-on-primary transition-all duration-300"
            >
              <span className="material-symbols-outlined text-base">download</span>
              Resume
            </a>
          </div>

          {/* Mobile Hamburger with Morphing Animation */}
          <button
            className="md:hidden relative w-10 h-10 flex items-center justify-center"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            <div className="relative w-5 h-4">
              <motion.span
                className="absolute left-0 w-5 h-[2px] bg-on-surface rounded origin-center"
                initial={false}
                animate={{
                  top: mobileOpen ? '7px' : '0px',
                  rotate: mobileOpen ? 45 : 0,
                }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              />
              <motion.span
                className="absolute left-0 top-[7px] w-5 h-[2px] bg-on-surface rounded"
                initial={false}
                animate={{
                  opacity: mobileOpen ? 0 : 1,
                  scaleX: mobileOpen ? 0 : 1,
                }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              />
              <motion.span
                className="absolute left-0 w-5 h-[2px] bg-on-surface rounded origin-center"
                initial={false}
                animate={{
                  top: mobileOpen ? '7px' : '14px',
                  rotate: mobileOpen ? -45 : 0,
                }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              />
            </div>
          </button>
        </div>

        {/* Mobile Menu */}
        <div className={`md:hidden overflow-hidden transition-all duration-500 ease-in-out ${mobileOpen ? 'max-h-[500px] pb-8' : 'max-h-0'}`}>
          <div className="flex flex-col gap-2 pt-4 border-t border-outline-variant/15">
            {links.map((link) => (
              <button
                key={link.id}
                onClick={() => scrollTo(link.id)}
                className={`px-4 py-3 rounded-xl text-base font-body font-medium text-left transition-all duration-300 ${
                  activeSection === link.id
                    ? 'text-primary-dim bg-primary/10'
                    : 'text-on-surface-variant hover:text-on-surface hover:bg-on-surface/5'
                }`}
              >
                {link.label}
              </button>
            ))}
            
            <div className="flex items-center justify-between px-4 py-4 mt-2 bg-surface-container-high/50 rounded-2xl border border-outline-variant/10">
              <span className="text-sm font-medium text-on-surface-variant">Theme Mode</span>
              <button
                onClick={() => useStore.getState().toggleTheme()}
                className="relative w-12 h-6 rounded-full bg-surface-container-highest border border-outline-variant/30 flex items-center p-1"
              >
                <div className={`w-4 h-4 rounded-full shadow-lg transform transition-all duration-500 flex items-center justify-center ${
                  useStore((s) => s.theme) === 'light' 
                    ? 'translate-x-6 bg-primary text-on-primary' 
                    : 'translate-x-0 bg-surface-container-highest text-primary-dim'
                }`}>
                  <span className="material-symbols-outlined text-[10px]">
                    {useStore((s) => s.theme) === 'light' ? 'light_mode' : 'dark_mode'}
                  </span>
                </div>
              </button>
            </div>

            <a
              href="resume.pdf"
              download
              className="flex items-center justify-center gap-3 w-full py-4 mt-2 rounded-2xl bg-primary text-on-primary font-bold text-sm tracking-widest uppercase shadow-lg shadow-primary/20"
            >
              <span className="material-symbols-outlined text-lg">download</span>
              Download Resume
            </a>
          </div>
        </div>
      </div>
    </nav>
  );
};
