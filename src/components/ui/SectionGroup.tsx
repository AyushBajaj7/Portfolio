/**
 * @fileoverview SectionGroup component - Main content sections with scroll-driven animations.
 * Handles scroll progress calculation, section visibility tracking, and animated reveals.
 * @author Ayush Bajaj
 */

import React, { useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useStore } from '../../store/useStore';
import portfolioData from '../../data/portfolio.json';

// Register GSAP plugins
gsap.registerPlugin(ScrollTrigger);

const GithubIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
  </svg>
);

const LinkedinIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
  </svg>
);

const TwitterIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const SOCIAL_ICONS: Record<string, React.ReactNode> = {
  github: <GithubIcon />,
  linkedin: <LinkedinIcon />,
  twitter: <TwitterIcon />,
};

/**
 * Skill icon component with grayscale-to-color hover effect.
 * Icons start grayscale and transition to full color on hover.
 */
const SkillIcon: React.FC<{ name: string }> = ({ name }) => {
  // Map skill names to emoji/icons (using emoji as simple icons)
  const iconMap: Record<string, string> = {
    'React.js': '⚛️',
    'HTML': '📄',
    'CSS': '🎨',
    'Basic Three.js': '🔮',
    'Node.js': '🟢',
    'Express.js': '🚂',
    'REST APIs': '🔌',
    'MongoDB / MySQL': '🗄️',
    'GitHub': '🐙',
    'FFmpeg': '🎬',
    'Python': '🐍',
    'Scikit-learn': '🧠',
    'Basic NLP': '💬',
    'Transformers (FLAN-T5)': '🤖',
    'AWS EC2': '☁️',
    'IAM': '🔐',
    'Amazon Polly': '🔊',
  };

  return (
    <span
      className="text-lg grayscale opacity-70 transition-all duration-300 group-hover:grayscale-0 group-hover:opacity-100 group-hover:scale-110"
      title={name}
    >
      {iconMap[name] || '•'}
    </span>
  );
};

/**
 * AnimatedCounter component - Animates numbers counting up when in view.
 * Uses Framer Motion spring physics for smooth, natural motion.
 * @param target - The final number to count to
 * @param suffix - Optional suffix (e.g., "+", "%")
 * @param duration - Animation duration in seconds (default: 2)
 */
const AnimatedCounter: React.FC<{ target: number; suffix?: string; duration?: number }> = ({
  target,
  suffix = '',
  duration = 2,
}) => {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.5 });
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isInView) return;

    let startTime: number;
    let animationFrame: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / (duration * 1000), 1);

      // Ease out cubic for smooth deceleration
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(easeOut * target));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [isInView, target, duration]);

  return (
    <span ref={ref}>
      {count}
      {suffix}
    </span>
  );
};

/**
 * StaggeredText component - Animates text letter by letter on load.
 * Creates a professional entrance effect for headlines.
 * @param text - The text to animate
 * @param className - Optional CSS classes
 * @param delay - Initial delay before animation starts (default: 0)
 */
const StaggeredText: React.FC<{ text: string; className?: string; delay?: number }> = ({
  text,
  className = '',
  delay = 0,
}) => {
  const letters = text.split('');

  const container = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
        delayChildren: delay,
      },
    },
  };

  const child = {
    hidden: {
      opacity: 0,
      y: 50,
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: 'spring' as const,
        damping: 12,
        stiffness: 200,
      },
    },
  };

  return (
    <motion.span
      className={`inline-block ${className}`}
      variants={container}
      initial="hidden"
      animate="visible"
    >
      {letters.map((letter, index) => (
        <motion.span
          key={index}
          variants={child}
          className="inline-block"
        >
          {letter === ' ' ? '\u00A0' : letter}
        </motion.span>
      ))}
    </motion.span>
  );
};

/**
 * TextScramble component - Creates a text decode effect on hover.
 * Letters scramble through random characters before resolving to target text.
 * @param text - The text to display and scramble
 * @param className - Optional CSS classes
 */
const TextScramble: React.FC<{ text: string; className?: string }> = ({
  text,
  className = '',
}) => {
  const [displayText, setDisplayText] = useState(text);
  const [isHovering, setIsHovering] = useState(false);
  const frameRef = useRef<number | null>(null);

  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  useEffect(() => {
    if (!isHovering) {
      setDisplayText(text);
      return;
    }

    let iteration = 0;
    const totalIterations = text.length * 3;

    const animate = () => {
      setDisplayText(
        text
          .split('')
          .map((char, index) => {
            if (char === ' ') return ' ';
            if (index < iteration / 3) {
              return text[index];
            }
            return chars[Math.floor(Math.random() * chars.length)];
          })
          .join('')
      );

      iteration++;

      if (iteration < totalIterations) {
        frameRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayText(text);
      }
    };

    frameRef.current = requestAnimationFrame(animate);

    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [isHovering, text]);

  return (
    <span
      className={`inline-block cursor-pointer ${className}`}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {displayText}
    </span>
  );
};

/**
 * HorizontalScrollProjects component - Displays projects in horizontal scroll gallery.
 * Uses GSAP ScrollTrigger to convert vertical scroll into horizontal movement.
 */
const HorizontalScrollProjects: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { projects } = portfolioData;

  useEffect(() => {
    const container = containerRef.current;
    const scrollContent = scrollRef.current;
    if (!container || !scrollContent) return;

    // Only apply on desktop
    const isDesktop = window.innerWidth >= 1024;
    if (!isDesktop) return;

    const scrollWidth = scrollContent.scrollWidth - window.innerWidth;

    const tween = gsap.to(scrollContent, {
      x: -scrollWidth,
      ease: 'none',
      scrollTrigger: {
        trigger: container,
        start: 'top top',
        end: () => `+=${scrollWidth}`,
        pin: true,
        scrub: 1,
        anticipatePin: 1,
      },
    });

    return () => {
      tween.kill();
      ScrollTrigger.getAll().forEach(st => st.kill());
    };
  }, []);

  return (
    <div ref={containerRef} className="relative h-screen hidden lg:block overflow-hidden">
      <div className="absolute top-8 left-8 z-10">
        <div className="flex items-center gap-4">
          <div className="w-8 h-[2px] bg-gradient-to-r from-primary to-transparent"></div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-display font-bold text-on-surface tracking-tight">
            <TextScramble text="Featured Projects" />
          </h2>
        </div>
        <p className="text-on-surface/60 text-sm mt-2 ml-12">Scroll to explore</p>
      </div>

      <div ref={scrollRef} className="flex items-center h-full gap-8 px-8 pl-[40vw]">
        {projects.map((project, idx) => (
          <motion.a
            key={project.id}
            href={project.link}
            target="_blank"
            rel="noreferrer"
            className="flex-shrink-0 w-[400px] h-[500px] rounded-2xl overflow-hidden group relative"
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            viewport={{ once: true }}
          >
            {/* Card Background */}
            <div className="glass-panel w-full h-full p-8 flex flex-col justify-between relative z-10">
              {/* Top */}
              <div>
                <span className="text-[10px] font-label text-primary-dim tracking-[0.2em] uppercase">
                  {project.subtitle}
                </span>
                <h3 className="text-2xl lg:text-3xl font-display font-bold text-on-surface mt-4 group-hover:text-[#00F2FF] transition-colors duration-300">
                  {project.title}
                </h3>
                <p className="text-on-surface/70 text-sm mt-3 line-clamp-3">
                  {project.description}
                </p>
              </div>

              {/* Bottom */}
              <div className="flex items-center justify-between">
                <div className="flex flex-wrap gap-2">
                  {project.tech.slice(0, 3).map((tech: string, i: number) => (
                    <span key={i} className="px-3 py-1 rounded-full bg-surface-container-high border border-outline-variant/30 text-[10px] font-label text-on-surface/80">
                      {tech}
                    </span>
                  ))}
                </div>
                <div className="w-12 h-12 rounded-full border border-outline-variant flex items-center justify-center group-hover:bg-primary group-hover:border-primary group-hover:text-on-primary transition-all duration-300">
                  <span className="material-symbols-outlined text-xl">arrow_outward</span>
                </div>
              </div>
            </div>

            {/* Hover Glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-tertiary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
          </motion.a>
        ))}
      </div>
    </div>
  );
};

/**
 * Framer Motion animation configuration for fade-up reveal effect.
 * Elements start invisible (opacity: 0) and 30px below final position (y: 30),
 * then animate to visible (opacity: 1) at final position (y: 0).
 * Animation duration: 600ms with ease-out curve for natural deceleration.
 * Triggers when element is 15% visible in viewport (amount: 0.15).
 */
const fadeUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  transition: { duration: 0.6, ease: 'easeOut' as const },
  viewport: { once: false, amount: 0.15 },
};

/**
 * Wrapper component for individual sections.
 * Tracks visibility using Framer Motion's useInView and updates active section in store.
 * 
 * @param {string} id - Unique section identifier
 * @param {React.ReactNode} children - Section content
 * @param {string} [className] - Optional CSS class names
 */
const SectionWrapper: React.FC<{ id: string; children: React.ReactNode; className?: string }> = ({
  id, children, className,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { amount: 0.3 });
  const setActiveSection = useStore((s) => s.setActiveSection);

  useEffect(() => {
    if (isInView) setActiveSection(id);
  }, [isInView, id, setActiveSection]);

  return (
    <div id={id} ref={ref} className={className}>
      <motion.div {...fadeUp}>{children}</motion.div>
    </div>
  );
};

/**
 * SectionGroup component - Main content sections with scroll-driven animations.
 * Calculates scroll progress for both mobile (window scroll) and desktop (container scroll).
 * 
 * @returns {React.ReactElement} The section group component
 */
export const SectionGroup: React.FC = () => {
  const { personal, projects, skills, socials } = portfolioData;
  const setHoveringAvatar = useStore((s) => s.setHoveringAvatar);
  const setScrollY = useStore((s) => s.setScrollY);
  const setScrollProgress = useStore((s) => s.setScrollProgress);
  const overlayRef = useRef<HTMLDivElement>(null);

  /**
   * Scroll handler - calculates scroll progress based on screen size.
   * Mobile (<768px): Uses window scroll
   * Desktop (≥768px): Uses container scroll
   */
  useEffect(() => {
    const scrollContainer = overlayRef.current;
    if (!scrollContainer) return;
    
    /**
     * Calculate scroll progress (0-1) for avatar animation.
     * Different scroll sources for mobile vs desktop:
     * - Mobile (<768px): Uses window scroll (body scrolls naturally)
     * - Desktop (≥768px): Uses container scroll (fixed overlay scrolls)
     * 
     * Scroll progress = currentScroll / maxScrollableDistance
     * Math.max(1, ...) prevents division by zero when content fits viewport
     */
    const onScroll = () => {
      const isSmallScreen = window.innerWidth < 768; // Match CSS breakpoint at 768px
      
      if (isSmallScreen) {
        // Mobile: Use document scroll position for avatar animation
        const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
        setScrollY(window.scrollY);
        setScrollProgress(window.scrollY / maxScroll);
      } else {
        // Desktop: Use container scroll position for avatar animation
        const maxScroll = Math.max(1, scrollContainer.scrollHeight - scrollContainer.clientHeight);
        setScrollY(scrollContainer.scrollTop);
        setScrollProgress(scrollContainer.scrollTop / maxScroll);
      }
    };
    
    // Listen to both window and container scroll events (passive for performance)
    window.addEventListener('scroll', onScroll, { passive: true });
    scrollContainer.addEventListener('scroll', onScroll, { passive: true });
    
    // Calculate initial scroll position on mount
    onScroll();
    
    // Cleanup: Remove listeners on unmount to prevent memory leaks
    return () => {
      window.removeEventListener('scroll', onScroll);
      scrollContainer.removeEventListener('scroll', onScroll);
    };
  }, [setScrollY, setScrollProgress]);

  return (
    <div className="ui-overlay" id="scroll-container" ref={overlayRef}>

      {/* ─── Ambient Background Glows (subtle, never blocking) ────── */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-15%] right-[-10%] w-[45vw] h-[45vw] bg-[var(--glow-1)] rounded-full blur-[280px] opacity-[var(--glow-opacity)]"></div>
        <div className="absolute bottom-[-20%] left-[-10%] w-[50vw] h-[50vw] bg-[var(--glow-2)] rounded-full blur-[300px] opacity-[var(--glow-opacity)]"></div>
        <div className="absolute top-1/2 left-1/3 w-[30vw] h-[30vw] bg-[var(--glow-3)] rounded-full blur-[250px] opacity-[var(--glow-opacity)]"></div>
      </div>

      {/* ─── Main Content Area ────────────────────────────────────── */}
      {/* 
        z-index: 10 ensures content renders above the canvas background (z-0).
        All sections are wrapped in SectionWrapper for scroll animation tracking.
      */}
      <div className="relative z-10">

        {/* ══════════════════════════════════════════════════════════ */}
        {/*                       HERO SECTION                       */}
        {/* ══════════════════════════════════════════════════════════ */}
        <SectionWrapper id="hero" className="min-h-screen flex flex-col justify-end lg:justify-center pb-12 lg:pb-0 pt-20">
          <div className="w-full max-w-screen-2xl mx-auto px-6 sm:px-8 lg:px-16 xl:px-24">
            <div className="flex flex-col lg:flex-row items-end lg:items-center justify-between gap-8 lg:gap-12">

              {/* 
                Left: Hero Text Content
                - Mobile: Uses glass-panel (semi-transparent background with blur)
                  for text readability over the canvas avatar
                - Desktop: Transparent background (lg:!bg-transparent) since avatar 
                  is positioned to the right side, no overlap occurs
              */}
              <div className="w-full lg:w-[55%] space-y-6 p-6 lg:p-8 rounded-3xl glass-panel lg:!bg-transparent lg:!backdrop-blur-none lg:border-none relative z-10">
                {/* Status Badge */}
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/20 bg-primary/5">
                  <span className="w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_var(--primary)] animate-pulse"></span>
                  <span className="text-[10px] font-label text-primary-dim tracking-[0.2em] uppercase">Available for Work</span>
                </div>

                {/* Name with Staggered Animation */}
                <h1 className="text-4xl xs:text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-display font-extrabold leading-[1.1] tracking-tight drop-shadow-xl">
                  <span className="block text-on-surface">
                    <StaggeredText text="Ayush Bajaj" delay={0.2} />
                  </span>
                  <span className="block bg-clip-text text-transparent bg-gradient-to-r from-[var(--title-gradient-from)] via-[var(--title-gradient-via)] to-[var(--title-gradient-to)] glow-cyan mt-1">
                    Software Developer
                  </span>
                </h1>

                {/* Bio */}
                <p className="text-on-surface/90 text-sm sm:text-base lg:text-lg font-body max-w-lg leading-snug sm:leading-relaxed drop-shadow-md">
                  {personal.tagline} {personal.bio}
                </p>

                {/* CTA Buttons */}
                <div className="flex flex-col sm:flex-row flex-wrap gap-3 pt-2">
                  <button
                    className="w-full sm:w-auto px-7 py-3.5 bg-gradient-to-r from-primary to-primary-container text-on-primary font-bold tracking-tight text-sm rounded-lg hover:scale-[1.03] hover:shadow-[0_0_30px_rgba(156,255,147,0.3)] transition-all duration-300"
                    onMouseEnter={() => setHoveringAvatar(true)}
                    onMouseLeave={() => setHoveringAvatar(false)}
                    onClick={() => document.getElementById('projects')?.scrollIntoView({ behavior: 'smooth' })}
                  >
                    View Projects
                  </button>
                  <button
                    className="w-full sm:w-auto px-7 py-3.5 rounded-lg border border-outline-variant/50 text-on-surface font-semibold tracking-tight text-sm hover:border-tertiary/40 hover:bg-tertiary/5 transition-all duration-300 flex items-center justify-center gap-2"
                    onClick={() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })}
                  >
                    <span className="material-symbols-outlined text-tertiary text-lg">mail</span>
                    Get in Touch
                  </button>
                  <a
                    href="resume.pdf"
                    download
                    className="w-full sm:w-auto px-7 py-3.5 rounded-lg bg-surface-container-high border border-outline-variant/50 text-on-surface font-semibold tracking-tight text-sm hover:border-primary/40 hover:bg-primary/5 transition-all duration-300 flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-primary text-lg">download</span>
                    Download Resume
                  </a>
                </div>

                {/* Stats Row with Animated Counters */}
                <div className="flex flex-wrap gap-6 sm:gap-8 pt-6 border-t border-outline-variant/20 mt-2">
                  <div>
                    <div className="text-xl sm:text-2xl font-display font-bold text-primary-dim">
                      <AnimatedCounter target={projects.length} suffix="+" duration={1.5} />
                    </div>
                    <div className="text-[10px] sm:text-[11px] font-label text-on-surface/90 tracking-wider uppercase mt-0.5">Projects</div>
                  </div>
                  <div>
                    <div className="text-xl sm:text-2xl font-display font-bold text-tertiary-dim">
                      <AnimatedCounter target={skills.reduce((acc, g) => acc + g.items.length, 0)} suffix="+" duration={2} />
                    </div>
                    <div className="text-[10px] sm:text-[11px] font-label text-on-surface/90 tracking-wider uppercase mt-0.5">Technologies</div>
                  </div>
                  <div>
                    <div className="text-xl sm:text-2xl font-display font-bold text-secondary-dim">
                      <AnimatedCounter target={3} suffix="+" duration={1.2} />
                    </div>
                    <div className="text-[10px] sm:text-[11px] font-label text-on-surface/90 tracking-wider uppercase mt-0.5">Years Exp</div>
                  </div>
                </div>
              </div>

              {/* Right: Empty space for 3D avatar to show through */}
              <div className="hidden lg:block lg:w-[40%]">
                {/* This space intentionally left empty — the scroll-driven 3D avatar behind is the visual element */}
              </div>
            </div>
          </div>
        </SectionWrapper>

        {/* ══════════════════════════════════════════════════════════ */}
        {/*                     PROJECTS SECTION                     */}
        {/* ══════════════════════════════════════════════════════════ */}
        <SectionWrapper id="projects" className="py-24 lg:py-32">
          <div className="max-w-screen-2xl mx-auto px-8 lg:px-16 xl:px-24">
            <div className="flex lg:flex-row flex-col gap-12">
              <div className="w-full lg:w-[45%]">
                <div className="flex items-center gap-4 mb-8 lg:mb-12">
                  <div className="w-8 h-[2px] bg-gradient-to-r from-primary to-transparent"></div>
                  <h2 className="text-2xl sm:text-3xl lg:text-4xl font-display font-bold text-on-surface tracking-tight">
                    <TextScramble text="Projects" />
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {projects.map((project, idx) => (
                    <a
                      key={project.id}
                      href={project.link}
                      target="_blank"
                      rel="noreferrer"
                      className={`group relative rounded-2xl overflow-hidden transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_8px_40px_rgba(0,242,255,0.1)] ${
                        idx === 0 ? 'md:col-span-2' : ''
                      }`}
                      onMouseEnter={() => setHoveringAvatar(true)}
                      onMouseLeave={() => setHoveringAvatar(false)}
                    >
                      {/* Card Background - transparent with subtle border */}
                      <div className="glass-panel rounded-2xl p-6 lg:p-8 h-full flex flex-col min-h-[260px] group-hover:border-[#00F2FF]/20 transition-colors duration-500">
                        {/* Top Row */}
                        <div className="flex justify-between items-start mb-auto">
                          <span className="text-[10px] font-label text-primary-dim tracking-[0.2em] uppercase">
                            {project.subtitle}
                          </span>
                          <span className="text-on-surface/90 opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-lg">↗</span>
                        </div>

                        {/* Content */}
                        <div className="mt-6">
                          <h3 className="text-xl lg:text-2xl font-display font-bold text-on-surface mb-2 group-hover:text-[#00F2FF] transition-colors duration-300">
                            {project.title}
                          </h3>
                          <p className="text-on-surface/90 text-sm leading-relaxed line-clamp-3 mb-4">
                            {project.description}
                          </p>
                          <div className="flex gap-2 flex-wrap">
                            {project.tech.slice(0, 4).map(t => (
                              <span key={t} className="text-[10px] font-label px-2.5 py-1 rounded-full border border-outline-variant/40 text-on-surface/80 tracking-wider">
                                {t}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </a>
                  ))}

                  {/* CTA Card */}
                  <button
                    className="group glass-panel rounded-2xl p-6 lg:p-8 flex flex-col justify-between min-h-[260px] cursor-pointer hover:border-primary/30 transition-all duration-500 text-left"
                    onClick={() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })}
                  >
                    <div>
                      <h3 className="text-xl font-display font-bold text-on-surface tracking-tight mb-2">Let's Build Together</h3>
                      <p className="text-on-surface/90 text-sm">Have a project idea? Let's discuss how we can bring it to life.</p>
                    </div>
                    <div className="w-10 h-10 rounded-full border border-outline-variant flex items-center justify-center group-hover:bg-primary group-hover:border-primary group-hover:text-on-primary transition-all duration-300 ml-auto">
                      <span className="material-symbols-outlined text-lg">arrow_forward</span>
                    </div>
                  </button>
                </div>
              </div>
              {/* Right side empty for avatar */}
              <div className="hidden lg:block lg:w-[55%]"></div>
            </div>
          </div>
        </SectionWrapper>

        {/* ══════════════════════════════════════════════════════════ */}
        {/*              HORIZONTAL SCROLL PROJECTS GALLERY            */}
        {/* ══════════════════════════════════════════════════════════ */}
        <HorizontalScrollProjects />

        {/* ══════════════════════════════════════════════════════════ */}
        {/*                      ABOUT SECTION                       */}
        {/* ══════════════════════════════════════════════════════════ */}
        <SectionWrapper id="about" className="py-24 lg:py-32">
          <div className="max-w-screen-2xl mx-auto px-8 lg:px-16 xl:px-24 flex">
            {/* Left side empty for avatar */}
            <div className="hidden lg:block lg:w-[55%]"></div>
            <div className="w-full lg:w-[45%]">
              <div className="glass-panel p-8 lg:p-12 rounded-2xl relative overflow-hidden">
                {/* Decorative glow */}
                <div className="absolute -top-20 -right-20 w-48 h-48 bg-[var(--glow-1)] opacity-[0.1] rounded-full blur-3xl pointer-events-none"></div>

                <div className="flex items-center gap-3 mb-6 lg:mb-8">
                  <div className="w-8 h-[2px] bg-gradient-to-r from-[#00F2FF] to-transparent"></div>
                  <h2 className="text-2xl sm:text-3xl font-display font-bold text-on-surface tracking-tight">About Me</h2>
                </div>

                <div className="space-y-6 relative z-10">
                  <p className="text-on-surface text-base lg:text-lg leading-relaxed font-body">
                    {personal.about}
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-6 border-t border-outline-variant/20">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-label tracking-widest uppercase text-primary">Location</span>
                      <span className="text-on-surface font-semibold">{personal.location}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-label tracking-widest uppercase text-tertiary">Focus Areas</span>
                      <span className="text-on-surface font-semibold">AI · Full Stack · 3D Web</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </SectionWrapper>

        {/* ══════════════════════════════════════════════════════════ */}
        {/*                     SKILLS SECTION                       */}
        {/* ══════════════════════════════════════════════════════════ */}
        <SectionWrapper id="skills" className="py-24 lg:py-32">
          <div className="max-w-screen-2xl mx-auto px-8 lg:px-16 xl:px-24">
            <div className="flex items-center gap-4 mb-8 lg:mb-12">
              <div className="w-8 h-[2px] bg-gradient-to-r from-tertiary to-transparent"></div>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-display font-bold text-on-surface tracking-tight">
                <TextScramble text="Skills" />
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {skills.map((group, i) => (
                <div key={i} className="glass-panel p-6 rounded-2xl hover:-translate-y-1 transition-all duration-300 hover:border-primary/20">
                  <h3 className="text-xs font-label tracking-widest uppercase text-primary-dim mb-5 pb-3 border-b border-outline-variant/20">
                    {group.category}
                  </h3>
                  <div className="flex flex-col gap-2.5">
                    {group.items.map((item, j) => (
                      <div key={j} className="group flex items-center gap-2.5 cursor-default">
                        <SkillIcon name={item} />
                        <span className="text-sm font-body text-on-surface group-hover:text-primary transition-colors duration-300">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Infinite Tech Stack Marquee */}
            <div className="mt-12 overflow-hidden">
              <div className="text-xs font-label tracking-widest uppercase text-on-surface/50 mb-4 text-center">Tech Stack</div>
              <div className="relative">
                {/* Gradient masks for smooth fade */}
                <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-[#0a0a0f] to-transparent z-10 pointer-events-none"></div>
                <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-[#0a0a0f] to-transparent z-10 pointer-events-none"></div>

                {/* Scrolling container */}
                <div className="flex animate-marquee">
                  {/* Double the items for seamless loop */}
                  {[...skills.flatMap(g => g.items), ...skills.flatMap(g => g.items)].map((skill, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 px-6 py-3 mx-2 rounded-full bg-surface-container-high/50 border border-outline-variant/30 whitespace-nowrap hover:border-primary/30 hover:bg-surface-container-high transition-all duration-300"
                    >
                      <span className="text-lg grayscale opacity-70 hover:grayscale-0 hover:opacity-100 transition-all duration-300">{['⚛️', '📄', '🎨', '🔮', '🟢', '🚂', '🔌', '🗄️', '🐙', '🎬', '🐍', '🧠', '💬', '🤖', '☁️', '🔐', '🔊'][i % 17]}</span>
                      <span className="text-sm font-body text-on-surface/80">{skill}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </SectionWrapper>

        {/* ══════════════════════════════════════════════════════════ */}
        {/*                    CONTACT SECTION                       */}
        {/* ══════════════════════════════════════════════════════════ */}
        <SectionWrapper id="contact" className="py-32 lg:py-40">
          <div className="max-w-screen-2xl mx-auto px-8 lg:px-16 xl:px-24 flex">
            <div className="w-full lg:w-[45%] text-left">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold text-on-surface mb-6 tracking-tight">
                Let's Connect
              </h2>
              <p className="text-on-surface/90 text-base lg:text-lg mb-10 leading-relaxed font-body">
                Open to exciting opportunities, collaborations, and interesting conversations.
                Whether it's a product idea, ML system, or immersive web experience — let's build together.
              </p>

              <a
                href={`mailto:${personal.email}`}
                className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-primary to-primary-container text-on-primary font-bold rounded-full hover:shadow-[0_0_40px_rgba(156,255,147,0.3)] hover:scale-[1.03] transition-all duration-300"
                onMouseEnter={() => setHoveringAvatar(true)}
                onMouseLeave={() => setHoveringAvatar(false)}
              >
                <span className="material-symbols-outlined">mail</span>
                {personal.email}
              </a>

              <div className="flex justify-start items-center gap-5 mt-14">
                {socials.map((s, i) => (
                  <a
                    key={i}
                    href={s.url}
                    className="w-12 h-12 rounded-full glass-panel flex items-center justify-center text-on-surface/90 hover:text-primary-dim hover:scale-110 hover:border-primary/30 transition-all duration-300"
                    target="_blank"
                    rel="noreferrer"
                    aria-label={s.platform}
                    onMouseEnter={() => setHoveringAvatar(true)}
                    onMouseLeave={() => setHoveringAvatar(false)}
                  >
                    {SOCIAL_ICONS[s.icon] ?? null}
                  </a>
                ))}
              </div>

              {/* Footer */}
              <div className="mt-20 pt-8 border-t border-outline-variant/15">
                <p className="text-on-surface/50 text-xs font-label tracking-wider">
                  © {new Date().getFullYear()} {personal.name} · Built with passion
                </p>
              </div>
            </div>
            {/* Right side empty for avatar */}
            <div className="hidden lg:block lg:w-[55%]"></div>
          </div>
        </SectionWrapper>

      </div>
    </div>
  );
};
