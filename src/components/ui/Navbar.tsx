/**
 * @fileoverview Navbar component - Fixed navigation with scroll detection and section highlighting.
 * Provides smooth scroll navigation, mobile menu, and active section indication.
 * @author Ayush Bajaj
 */

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Menu, Moon, Sun, X } from 'lucide-react';
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
  const [edgeReveal, setEdgeReveal] = useState(false);
  const [navHovered, setNavHovered] = useState(false);
  const [isDesktopNav, setIsDesktopNav] = useState(
    typeof window !== 'undefined' ? window.innerWidth >= 1024 : true
  );
  const [mobileOpen, setMobileOpen] = useState(false);
  const activeSection = useStore((s) => s.activeSection);
  const theme = useStore((s) => s.theme);
  const toggleTheme = useStore((s) => s.toggleTheme);
  const scrollProgress = useStore((s) => s.scrollProgress);

  useEffect(() => {
    const scrollContainer = document.getElementById('scroll-container');
    if (!scrollContainer) return;

    const onScroll = () => {
      const currentScrollY = window.innerWidth < 768 ? window.scrollY : scrollContainer.scrollTop;
      setScrollTop(currentScrollY);
      setScrolled(currentScrollY > 24);
    };

    const onResize = () => {
      const desktopNav = window.innerWidth >= 1024;
      setIsDesktopNav(desktopNav);
      if (!desktopNav) {
        setEdgeReveal(false);
        setNavHovered(false);
      }
    };

    const onMouseMove = (event: MouseEvent) => {
      if (window.innerWidth < 1024) return;
      setEdgeReveal(event.clientY <= 72);
    };

    const onWindowLeave = () => {
      setEdgeReveal(false);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    window.addEventListener('mousemove', onMouseMove, { passive: true });
    window.addEventListener('mouseleave', onWindowLeave);
    scrollContainer.addEventListener('scroll', onScroll, { passive: true });
    onResize();
    onScroll();

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseleave', onWindowLeave);
      scrollContainer.removeEventListener('scroll', onScroll);
    };
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

  const shouldHide = isDesktopNav && scrollTop > 96 && !edgeReveal && !navHovered && !mobileOpen;

  return (
    <nav
      onMouseEnter={() => setNavHovered(true)}
      onMouseLeave={() => setNavHovered(false)}
      className={`fixed top-0 w-full z-50 transition-all duration-500 ${
        scrolled ? 'glass-panel shadow-lg border-x-0 border-t-0 rounded-none' : 'bg-transparent'
      } ${shouldHide ? '-translate-y-[120%]' : 'translate-y-0'}`}
    >
      <div className="max-w-screen-2xl mx-auto px-6 lg:px-12">
        <div className="flex justify-between items-center h-16">
          <button
            className="text-lg font-display font-bold tracking-tight text-on-surface hover:text-primary-dim transition-colors duration-300"
            onClick={() => scrollTo('hero')}
          >
            Ayush Bajaj<span className="text-primary-dim">.</span>
          </button>

          <div className="hidden lg:flex items-center gap-6">
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

            <button
              onClick={toggleTheme}
              className="relative flex h-8 w-14 items-center rounded-full border border-outline-variant bg-surface-container-high p-1 transition-all duration-300 hover:border-primary/40"
              aria-label="Toggle theme"
            >
              <div
                className={`flex h-6 w-6 items-center justify-center rounded-full shadow-lg transition-all duration-300 ${
                  theme === 'light'
                    ? 'translate-x-6 bg-primary text-on-primary'
                    : 'translate-x-0 bg-surface-container-highest text-primary-dim'
                }`}
              >
                {theme === 'light' ? <Sun size={14} /> : <Moon size={14} />}
              </div>
            </button>

            <a
              href="resume.pdf"
              download
              className="hidden xl:flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/8 border border-primary/20 text-primary-dim text-xs font-bold tracking-wider uppercase hover:bg-primary hover:text-on-primary transition-all duration-300"
            >
              <Download size={16} />
              Resume
            </a>
          </div>

          <button
            className="lg:hidden relative z-50 flex h-10 w-10 items-center justify-center rounded-lg border border-outline-variant bg-surface-container-high/70 text-on-surface"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <motion.div
          className="absolute bottom-0 left-0 h-[2px] bg-gradient-to-r from-primary via-tertiary to-primary-dim"
          style={{ width: `${Math.round(scrollProgress * 100)}%` }}
        />

        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              className="fixed inset-0 z-40 flex items-center justify-center bg-surface/96 px-6 backdrop-blur-xl lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <motion.div
                className="flex flex-col items-center gap-8"
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 50, opacity: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
              >
                {links.map((link, i) => (
                  <motion.button
                    key={link.id}
                    onClick={() => scrollTo(link.id)}
                    className={`text-3xl sm:text-4xl font-display font-bold transition-colors duration-300 ${
                      activeSection === link.id ? 'text-primary' : 'text-on-surface'
                    }`}
                    initial={{ y: 30, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 30, opacity: 0 }}
                    transition={{ duration: 0.3, delay: i * 0.1 }}
                    whileHover={{ scale: 1.03, x: 12 }}
                  >
                    {link.label}
                  </motion.button>
                ))}
              </motion.div>

              <motion.div
                className="absolute bottom-8 left-6 text-xs font-label uppercase tracking-[0.2em] text-on-surface/45"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                AYUSH BAJAJ PORTFOLIO
              </motion.div>

              <motion.div
                className="absolute bottom-6 right-6 flex items-center gap-3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                <button
                  onClick={toggleTheme}
                  className="flex h-11 w-11 items-center justify-center rounded-lg border border-outline-variant bg-surface-container-high text-on-surface transition hover:border-primary/45 hover:text-primary"
                  aria-label="Toggle theme"
                >
                  {theme === 'light' ? <Moon size={24} /> : <Sun size={24} />}
                </button>
                <a
                  href="resume.pdf"
                  download
                  className="flex h-11 w-11 items-center justify-center rounded-lg border border-primary/30 bg-primary text-on-primary"
                  aria-label="Download resume"
                >
                  <Download size={20} />
                </a>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  );
};
