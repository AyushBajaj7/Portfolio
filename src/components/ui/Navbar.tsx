import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { Download, Menu, X } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { subscribeScrollTimeline } from '../../lib/scrollTimeline';

const links = [
  { id: 'hero', label: 'Home' },
  { id: 'projects', label: 'Projects' },
  { id: 'about', label: 'About' },
  { id: 'skills', label: 'Skills' },
  { id: 'contact', label: 'Contact' },
];

/** A stable navigation landmark. The shared scroll timeline owns section selection. */
export const Navbar: React.FC = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const activeSection = useStore((state) => state.activeSection);
  const navRef = useRef<HTMLElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => subscribeScrollTimeline(({ scrollY, progress }) => {
    if (navRef.current) navRef.current.dataset.scrolled = String(scrollY > 24);
    if (progressBarRef.current) {
      progressBarRef.current.style.transform = `scaleX(${Math.max(0, Math.min(1, progress))})`;
    }
  }), []);

  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 1024px)');
    const closeOnDesktop = (event: MediaQueryListEvent) => {
      if (event.matches) setMobileOpen(false);
    };
    desktop.addEventListener('change', closeOnDesktop);
    return () => desktop.removeEventListener('change', closeOnDesktop);
  }, []);

  useEffect(() => {
    if (!mobileOpen) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    const appRoot = document.getElementById('root');
    const previousInert = appRoot?.inert ?? false;
    if (appRoot) appRoot.inert = true;
    document.body.style.overflow = 'hidden';
    const focusFrame = requestAnimationFrame(() => {
      dialogRef.current?.querySelector<HTMLElement>('[aria-current="location"], a, button')?.focus();
    });

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setMobileOpen(false);
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const controls = Array.from(dialogRef.current.querySelectorAll<HTMLElement>('a[href], button, [tabindex="0"]'));
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && (document.activeElement === first || !dialogRef.current.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !dialogRef.current.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      cancelAnimationFrame(focusFrame);
      document.body.style.overflow = previousOverflow;
      if (appRoot) appRoot.inert = previousInert;
      document.removeEventListener('keydown', onKeyDown);
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, [mobileOpen]);

  const navigate = useCallback((event: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const element = document.getElementById(id);
    if (!element) return;
    event.preventDefault();
    setMobileOpen(false);
    requestAnimationFrame(() => {
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      element.scrollIntoView({ behavior: reducedMotion ? 'instant' : 'smooth', block: 'start' });
      element.setAttribute('tabindex', '-1');
      element.focus({ preventScroll: true });
      window.history.replaceState(null, '', `#${id}`);
    });
  }, []);

  return (
    <>
      <nav
        ref={navRef}
        aria-label="Primary navigation"
        className="fixed inset-x-0 top-0 z-[60] border-b border-transparent bg-surface/90 backdrop-blur-md transition-[background-color,border-color,box-shadow] duration-200 data-[scrolled=true]:border-outline-variant data-[scrolled=true]:bg-surface/95 data-[scrolled=true]:shadow-lg"
      >
        <div className="relative max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-12">
          <div className="flex justify-between items-center h-16 gap-4">
            <a
              href="#hero"
              onClick={(event) => navigate(event, 'hero')}
              className="shrink-0 text-lg font-display font-bold tracking-tight text-on-surface hover:text-primary-dim transition-colors"
              aria-label="Ayush Bajaj, home"
            >
              Ayush Bajaj<span className="text-primary-dim">.</span>
            </a>

            <div className="hidden lg:flex items-center gap-5">
              <LayoutGroup id="navbar-pill">
                <div className="flex items-center gap-0.5 rounded-xl border border-outline-variant bg-surface-container-high/40 p-1">
                  {links.map((link) => (
                    <a
                      key={link.id}
                      href={`#${link.id}`}
                      onClick={(event) => navigate(event, link.id)}
                      aria-current={activeSection === link.id ? 'location' : undefined}
                      className={`relative px-3.5 py-2 rounded-lg text-sm font-body font-medium transition-colors ${
                        activeSection === link.id ? 'text-on-surface' : 'text-on-surface-variant hover:text-on-surface'
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
                    </a>
                  ))}
                </div>
              </LayoutGroup>
              <a
                href={`${import.meta.env.BASE_URL}resume.pdf`}
                download
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary/8 border border-primary/18 text-primary-dim text-xs font-bold tracking-wider uppercase hover:bg-primary hover:text-on-primary transition-colors"
              >
                <Download size={15} aria-hidden="true" />
                Resume
              </a>
            </div>

            <button
              type="button"
              className="lg:hidden flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-outline-variant bg-surface-container-high/80 text-on-surface"
              onClick={() => setMobileOpen((open) => !open)}
              aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={mobileOpen}
              aria-controls="mobile-navigation"
              aria-haspopup="dialog"
            >
              {mobileOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
            </button>
          </div>
          <div
            ref={progressBarRef}
            aria-hidden="true"
            className="absolute bottom-0 left-0 h-[2px] w-full origin-left bg-gradient-to-r from-primary to-tertiary"
            style={{ transform: 'scaleX(0)' }}
          />
        </div>
      </nav>

      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              className="fixed inset-0 z-[70] overflow-y-auto overscroll-contain bg-background/80 px-4 py-5 backdrop-blur-sm lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.16 }}
              onClick={(event) => {
                if (event.target === event.currentTarget) setMobileOpen(false);
              }}
            >
              <div
                ref={dialogRef}
                id="mobile-navigation"
                role="dialog"
                aria-modal="true"
                aria-labelledby="mobile-navigation-title"
                className="mx-auto w-full max-w-md rounded-2xl border border-outline-variant bg-surface-container p-4 shadow-2xl"
              >
                <div className="flex items-center justify-between gap-4 px-2 pb-4">
                  <p id="mobile-navigation-title" className="font-display font-semibold text-on-surface">Explore the portfolio</p>
                  <button
                    type="button"
                    onClick={() => setMobileOpen(false)}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-outline-variant text-on-surface hover:bg-surface-container-high"
                    aria-label="Close navigation menu"
                  >
                    <X size={20} aria-hidden="true" />
                  </button>
                </div>
                <div className="flex flex-col gap-1">
                  {links.map((link) => (
                    <a
                      key={link.id}
                      href={`#${link.id}`}
                      onClick={(event) => navigate(event, link.id)}
                      aria-current={activeSection === link.id ? 'location' : undefined}
                      className={`rounded-xl px-4 py-3.5 text-lg font-display font-semibold transition-colors ${
                        activeSection === link.id ? 'text-primary bg-primary/8' : 'text-on-surface hover:text-primary-dim hover:bg-surface-container-high/60'
                      }`}
                    >
                      {link.label}
                    </a>
                  ))}
                </div>
                <a
                  href={`${import.meta.env.BASE_URL}resume.pdf`}
                  download
                  className="mt-5 flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-on-primary hover:bg-primary-dim transition-colors"
                >
                  <Download size={16} aria-hidden="true" />
                  Download Resume
                </a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  );
};
