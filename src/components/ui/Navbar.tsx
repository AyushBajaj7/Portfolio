import React, { useState, useEffect } from 'react';
import { useStore } from '../../store/useStore';

export const Navbar: React.FC = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const activeSection = useStore((s) => s.activeSection);

  useEffect(() => {
    const el = document.getElementById('scroll-container');
    if (!el) return;
    const onScroll = () => setScrolled(el.scrollTop > 40);
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
    setMobileOpen(false);
  };

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
          ? 'glass-panel shadow-lg border-x-0 border-t-0 rounded-none'
          : 'bg-transparent'
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
                <button
                  key={link.id}
                  onClick={() => scrollTo(link.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-body font-medium transition-all duration-300 ${
                    activeSection === link.id
                      ? 'text-primary-dim bg-primary/10'
                      : 'text-on-surface-variant hover:text-on-surface hover:bg-on-surface/5'
                  }`}
                >
                  {link.label}
                </button>
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
              href="/resume.pdf"
              download
              className="hidden lg:flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/8 border border-primary/20 text-primary-dim text-xs font-bold tracking-wider uppercase hover:bg-primary hover:text-on-primary transition-all duration-300"
            >
              <span className="material-symbols-outlined text-base">download</span>
              Resume
            </a>
          </div>

          {/* Mobile Hamburger */}
          <button
            className="md:hidden flex flex-col gap-[5px] p-2"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            <span className={`block w-5 h-[2px] bg-on-surface rounded transition-transform duration-300 ${mobileOpen ? 'rotate-45 translate-y-[7px]' : ''}`}></span>
            <span className={`block w-5 h-[2px] bg-on-surface rounded transition-opacity duration-300 ${mobileOpen ? 'opacity-0' : ''}`}></span>
            <span className={`block w-5 h-[2px] bg-on-surface rounded transition-transform duration-300 ${mobileOpen ? '-rotate-45 -translate-y-[7px]' : ''}`}></span>
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
              href="/resume.pdf"
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
