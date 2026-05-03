/**
 * @fileoverview SectionGroup component - Main content sections for the portfolio.
 * Handles hero, projects (with horizontal scroll on desktop), about, skills, and contact sections.
 * Implements scroll-driven animations, project filtering, and responsive layouts.
 * @author Ayush Bajaj
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  Check,
  Code2,
  Copy,
  Download,
  ExternalLink,
  Layers3,
  Mail,
  MapPin,
  Server,
  Sparkles,
} from 'lucide-react';
import portfolioData from '../../data/portfolio.json';
import { useStore } from '../../store/useStore';

type Project = (typeof portfolioData.projects)[number];
type SkillGroup = (typeof portfolioData.skills)[number];

// Constants for scroll and animation thresholds
const SECTION_VIEWPORT_THRESHOLD = 0.16;
const SECTION_VIEWPORT_THRESHOLD_LARGE = 0.34;
const HORIZONTAL_SEGMENT_THRESHOLD = 72;
const PROGRESS_UPDATE_THRESHOLD = 0.002;

const reveal = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  transition: { duration: 0.52, ease: 'easeOut' as const },
  viewport: { once: true, amount: SECTION_VIEWPORT_THRESHOLD },
};

const skillIcons = [Code2, Server, Sparkles, Layers3];

const sectionCopy = {
  projects: {
    eyebrow: 'Work',
    title: 'Projects',
    copy: 'Selected work across full-stack, machine learning, and 3D systems.',
  },
  about: {
    eyebrow: 'Profile',
    title: 'About',
  },
  skills: {
    eyebrow: 'Skills',
    title: 'Skills',
    copy: 'Technical strengths and engineering fundamentals behind the work.',
  },
  contact: {
    eyebrow: 'Contact',
    title: 'Contact',
    copy: 'Open to software roles and focused collaboration.',
  },
};


const capabilitySummaries: Record<string, string> = {
  'Frontend Engineering': 'Responsive interfaces, component systems, and interaction states.',
  'Backend Systems': 'API design, application logic, and structured data handling.',
  'Applied AI': 'Model workflows, evaluation, and production-minded ML usage.',
  'Deployment & Media': 'Cloud delivery, media processing, and 3D asset workflows.',
  'Engineering Foundations': 'Problem solving, debugging, and structured technical thinking.',
};

const heroDots = [
  { id: 1, x: '8%', y: '22%', size: 16, opacity: '0.22' },
  { id: 2, x: '27%', y: '18%', size: 5, opacity: '0.28' },
  { id: 3, x: '66%', y: '30%', size: 10, opacity: '0.12' },
  { id: 4, x: '84%', y: '14%', size: 4, opacity: '0.2' },
  { id: 5, x: '72%', y: '72%', size: 6, opacity: '0.12' },
];

const getProjectCategory = (project: Project) => {
  const searchable = `${project.title} ${project.subtitle} ${project.tech.join(' ')}`.toLowerCase();
  if (searchable.includes('flan') || searchable.includes('disease') || searchable.includes('ml') || searchable.includes('ai')) {
    return 'AI / ML';
  }
  if (searchable.includes('3d') || searchable.includes('unity') || searchable.includes('opengl')) {
    return '3D Systems';
  }
  return 'Full Stack';
};

const getCodePreviewLines = (preview: string, limit = 4) =>
  preview
    .trim()
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, limit);

const getCodePreviewLineCount = (preview: string) =>
  preview
    .trim()
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean).length;

const getImplementationFocus = (project: Project) => {
  const searchable = `${project.title} ${project.subtitle} ${project.tech.join(' ')}`.toLowerCase();

  if (searchable.includes('agriconnect') || searchable.includes('express') || searchable.includes('mongo')) {
    return 'Data flow and service wiring';
  }
  if (searchable.includes('ppt') || searchable.includes('flan') || searchable.includes('polly')) {
    return 'Pipeline orchestration';
  }
  if (searchable.includes('disease') || searchable.includes('scikit') || searchable.includes('knn')) {
    return 'Model evaluation setup';
  }
  if (searchable.includes('3d') || searchable.includes('unity') || searchable.includes('opengl')) {
    return 'Interaction loop behavior';
  }

  return 'Implementation snapshot';
};

const GithubMark: React.FC<{ size?: number }> = ({ size = 17 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
    <path d="M12 2C6.48 2 2 6.58 2 12.24c0 4.52 2.87 8.35 6.84 9.71.5.1.68-.22.68-.49v-1.9c-2.78.62-3.37-1.22-3.37-1.22-.45-1.19-1.11-1.5-1.11-1.5-.91-.64.07-.63.07-.63 1 .07 1.53 1.06 1.53 1.06.9 1.57 2.34 1.12 2.91.85.09-.66.35-1.12.64-1.38-2.22-.26-4.56-1.14-4.56-5.06 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.71 0 0 .84-.28 2.75 1.05A9.35 9.35 0 0 1 12 6.93c.85 0 1.7.12 2.5.35 1.91-1.33 2.75-1.05 2.75-1.05.55 1.41.2 2.45.1 2.71.64.72 1.03 1.63 1.03 2.75 0 3.93-2.34 4.8-4.57 5.06.36.32.68.94.68 1.9v2.81c0 .27.18.59.69.49A10.13 10.13 0 0 0 22 12.24C22 6.58 17.52 2 12 2Z" />
  </svg>
);

const LinkedinMark: React.FC<{ size?: number }> = ({ size = 17 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
    <path d="M4.98 3.5a2.5 2.5 0 1 1 0 5.001 2.5 2.5 0 0 1 0-5ZM3 9.75h4v10.75H3V9.75Zm6.2 0h3.83v1.47h.05c.53-.96 1.84-1.75 3.78-1.75 4.04 0 4.79 2.45 4.79 5.63v5.4h-4v-4.79c0-1.14-.02-2.61-1.73-2.61-1.73 0-2 1.25-2 2.53v4.87h-4V9.75Z" />
  </svg>
);

const socialIcons = {
  github: GithubMark,
  linkedin: LinkedinMark,
};

const SectionShell: React.FC<{
  id: string;
  children: React.ReactNode;
  className?: string;
}> = ({ id, children, className = '' }) => {
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, { amount: SECTION_VIEWPORT_THRESHOLD_LARGE });
  const setActiveSection = useStore((state) => state.setActiveSection);

  useEffect(() => {
    if (isInView) {
      setActiveSection(id);
    }
  }, [id, isInView, setActiveSection]);

  return (
    <section id={id} ref={ref} className={`section-snap relative ${className}`}>
      {children}
    </section>
  );
};

const SectionHeading: React.FC<{
  eyebrow: string;
  title: string;
  copy?: string;
  className?: string;
}> = ({ eyebrow, title, copy, className = '' }) => (
  <motion.div {...reveal} className={`max-w-3xl ${className}`}>
    <p className="mb-3 text-xs font-label font-semibold uppercase tracking-[0.24em] text-primary-dim">
      {eyebrow}
    </p>
    <h2 className="text-2xl font-display font-bold leading-tight text-on-surface sm:text-3xl lg:text-4xl">
      {title}
    </h2>
    {copy && <p className="mt-4 text-base leading-8 text-on-surface-variant sm:text-lg">{copy}</p>}
  </motion.div>
);

const Metric: React.FC<{ value: string; label: string }> = ({ value, label }) => (
  <div className="surface-panel rounded-xl p-4 sm:p-5">
    <div className="text-2xl font-display font-bold text-on-surface">{value}</div>
    <div className="mt-1 text-[11px] font-label uppercase tracking-[0.18em] text-on-surface-variant">
      {label}
    </div>
  </div>
);

const ProjectCard: React.FC<{ project: Project; index: number; rail?: boolean }> = ({
  project,
  index,
  rail = false,
}) => {
  const previewLines = project.codePreview ? getCodePreviewLines(project.codePreview, rail ? 2 : 4) : [];
  const totalLines = project.codePreview ? getCodePreviewLineCount(project.codePreview) : 0;

  return (
    <motion.article
      {...reveal}
      className={`project-card group grid overflow-hidden rounded-xl border border-outline-variant transition-[border-color,box-shadow] duration-200 hover:border-primary/30 ${
        rail ? 'h-auto min-h-[20rem]' : 'min-h-[20rem]'
      }`}
    >
      <div className={`flex h-full flex-col p-5 lg:p-6`}>
        <div className="mb-4 flex items-center justify-between gap-4">
          <span className="rounded-full border border-outline-variant bg-surface/64 px-3 py-1 text-xs font-label uppercase tracking-[0.18em] text-on-surface-variant">
            {String(index + 1).padStart(2, '0')}
          </span>
          <span className="text-[11px] font-label uppercase tracking-[0.18em] text-on-surface-variant">
            {getProjectCategory(project)}
          </span>
        </div>
        <p className="text-xs font-label uppercase tracking-[0.18em] text-primary-dim">{project.subtitle}</p>
        <h3 className="mt-3 text-xl font-display font-bold leading-tight text-on-surface">
          {project.title}
        </h3>
        <p className="mt-4 flex-1 text-sm leading-6 text-on-surface-variant project-description-rail">
          {project.description}
        </p>

        {previewLines.length > 0 && (
          <div className="mt-4 overflow-hidden rounded-xl border border-outline-variant bg-surface/72">
            <div className="flex items-start justify-between gap-4 border-b border-outline-variant px-4 py-3">
              <div>
                <p className="text-[10px] font-label uppercase tracking-[0.18em] text-on-surface-variant">
                  Technical note
                </p>
                <p className="mt-1 text-[11px] font-label uppercase tracking-[0.16em] text-primary-dim">
                  {getImplementationFocus(project)}
                </p>
              </div>
              <span className="rounded-full border border-outline-variant bg-surface/70 px-2.5 py-1 text-[10px] font-label uppercase tracking-[0.16em] text-on-surface-variant">
                {totalLines} lines
              </span>
            </div>

            <div className="pointer-events-none select-none px-4 py-3">
              {previewLines.map((line, lineIndex) => (
                <div
                  key={`${project.id}-${lineIndex}`}
                  className={`grid grid-cols-[28px_minmax(0,1fr)] gap-3 py-2 ${
                    lineIndex === 0 ? '' : 'border-t border-outline-variant/60'
                  }`}
                >
                  <span className="text-[10px] font-label uppercase tracking-[0.16em] text-on-surface-variant/70">
                    {String(lineIndex + 1).padStart(2, '0')}
                  </span>
                  <code className="block overflow-hidden text-ellipsis whitespace-nowrap text-[11px] leading-6 text-on-surface lg:text-[12px]">
                    {line}
                  </code>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6 flex flex-wrap gap-2">
          {project.tech.slice(0, 5).map((tech) => (
            <span
              key={tech}
              className="rounded-full border border-outline-variant bg-surface-container-high/60 px-3 py-1 text-[11px] text-on-surface-variant"
            >
              {tech}
            </span>
          ))}
        </div>

        <div className="mt-6 flex items-center justify-end gap-4">
          <a
            href={project.link}
            target="_blank"
            rel="noreferrer"
            data-cursor="view"
            className="inline-flex items-center gap-2 rounded-lg border border-outline-variant bg-surface/70 px-4 py-2 text-sm font-semibold text-on-surface transition hover:border-primary/45 hover:text-primary"
          >
            View source
            <ExternalLink size={16} />
          </a>
        </div>
      </div>
    </motion.article>
  );
};

const SkillCard: React.FC<{ group: SkillGroup; index: number }> = ({ group, index }) => {
  const Icon = skillIcons[index % skillIcons.length];

  return (
    <motion.div {...reveal} className="surface-panel-subtle rounded-xl p-6">
      <div className="mb-5 flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/8 text-primary">
          <Icon size={21} />
        </div>
        <div>
          <h3 className="text-xl font-display font-bold text-on-surface">{group.category}</h3>
          <p className="mt-1 text-sm leading-6 text-on-surface-variant">
            {capabilitySummaries[group.category] ?? 'Tools and habits used repeatedly across the work.'}
          </p>
        </div>
      </div>
      <div className="grid gap-3">
        {group.items.map((item) => (
          <div key={item} className="flex items-center gap-3 text-[1.02rem] leading-7 text-on-surface-variant">
            <Check size={16} className="text-primary-dim" />
            <span>{item}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

const ContactActions: React.FC<{ email: string }> = ({ email }) => {
  const [copied, setCopied] = useState(false);

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      window.location.href = `mailto:${email}`;
    }
  };

  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <a
        href={`mailto:${email}`}
        className="inline-flex items-center justify-center gap-2 rounded-lg border border-primary/35 bg-primary px-5 py-3 text-sm font-semibold !text-on-primary transition hover:bg-primary-dim"
      >
        <Mail size={18} />
        Send email
      </a>
      <button
        type="button"
        onClick={copyEmail}
        className="inline-flex items-center justify-center gap-2 rounded-lg border border-outline-variant bg-surface-container-high/70 px-5 py-3 text-sm font-semibold text-on-surface transition hover:border-primary/45 hover:text-primary"
      >
        {copied ? <Check size={18} /> : <Copy size={18} />}
        {copied ? 'Copied' : 'Copy email'}
      </button>
      <span className="sr-only" aria-live="polite">
        {copied ? 'Email copied to clipboard' : ''}
      </span>
    </div>
  );
};

export const SectionGroup: React.FC = () => {
  const { personal, projects, skills, socials } = portfolioData;
  const overlayRef = useRef<HTMLDivElement>(null);
  const horizontalSectionRef = useRef<HTMLElement>(null);
  const horizontalViewportRef = useRef<HTMLDivElement>(null);
  const horizontalTrackRef = useRef<HTMLDivElement>(null);
  const horizontalTravelRef = useRef(0);
  const lastScrollProgressRef = useRef(0);
  const lastHorizontalProgressRef = useRef(0);
  const lastScrollModeRef = useRef<'vertical' | 'horizontal'>('vertical');
  const setScrollProgress = useStore((state) => state.setScrollProgress);
  const setHorizontalProgress = useStore((state) => state.setHorizontalProgress);
  const setScrollMode = useStore((state) => state.setScrollMode);
  const setActiveSection = useStore((state) => state.setActiveSection);
  const [projectFilter, setProjectFilter] = useState('All');
  const [horizontalProgress, setLocalRailProgress] = useState(0);
  const [showResumeCue, setShowResumeCue] = useState(false);
  const cueDismissedRef = useRef(false);

  // ENTRANCE: show resume cue after page settles
  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (!cueDismissedRef.current) {
        setShowResumeCue(true);
      }
    }, 100);
    return () => window.clearTimeout(timer);
  }, []);

    // DISMISS: auto-hide on interaction or timeout
    // Using a ref to prevent StrictMode from overriding state immediately
  useEffect(() => {
    if (!showResumeCue) return;

    let dismissed = false;
    const dismiss = () => {
      if (dismissed) return;
      dismissed = true;
      cueDismissedRef.current = true;
      setShowResumeCue(false);
    };

    const autoHide = window.setTimeout(dismiss, 10000);

    // Track initial scroll position to distinguish real user scrolls from layout-induced ones
    // Layout-induced scroll events fire during initial paint and would falsely trigger dismiss
    let initialScrollY = -1;
    const scrollDismiss = () => {
      const container = document.getElementById('scroll-container');
      const currentY = container ? container.scrollTop : window.scrollY;
      if (initialScrollY < 0) {
        initialScrollY = currentY;
        return; // First scroll event — record baseline, don't dismiss
      }
      if (Math.abs(currentY - initialScrollY) > 30) {
        dismiss();
      }
    };

    // Delay attaching interaction listeners so we don't catch initial clicks/scrolls
    const attachDelay = window.setTimeout(() => {
      // NOTE: DO NOT use anonymous wrappers in addEventListener, or removeEventListener will fail
      window.addEventListener('click', dismiss, { once: true });
      window.addEventListener('touchstart', dismiss, { once: true, passive: true });
      window.addEventListener('scroll', scrollDismiss, { passive: true });
      const scrollContainer = document.getElementById('scroll-container');
      if (scrollContainer) {
        scrollContainer.addEventListener('scroll', scrollDismiss, { passive: true });
      }
    }, 500);

    return () => {
      window.clearTimeout(autoHide);
      window.clearTimeout(attachDelay);
      window.removeEventListener('click', dismiss);
      window.removeEventListener('touchstart', dismiss);
      window.removeEventListener('scroll', scrollDismiss);
      const scrollContainer = document.getElementById('scroll-container');
      if (scrollContainer) {
        scrollContainer.removeEventListener('scroll', scrollDismiss);
      }
    };
  }, [showResumeCue]);

  const allSkills = useMemo(() => skills.flatMap((group) => group.items), [skills]);
  const projectFilters = useMemo(
    () => ['All', ...Array.from(new Set(projects.map(getProjectCategory)))],
    [projects],
  );
  const visibleProjects = useMemo(
    () => projects.filter((project) => projectFilter === 'All' || getProjectCategory(project) === projectFilter),
    [projectFilter, projects],
  );

  const handleHorizontalWheel = useCallback((event: React.WheelEvent<HTMLDivElement>) => {
    if (window.innerWidth < 1024) return;

    const rect = horizontalSectionRef.current?.getBoundingClientRect();
    if (!rect || !overlayRef.current) return;
    
    const inHorizontalSegment = rect.top <= HORIZONTAL_SEGMENT_THRESHOLD && rect.bottom >= window.innerHeight;
    if (!inHorizontalSegment) return;

    // Allow scroll-through at boundaries: if the track is fully scrolled
    // in the wheel direction, let the event pass to resume vertical scrolling
    const progress = lastHorizontalProgressRef.current;
    const scrollingDown = event.deltaY > 0;
    const scrollingUp = event.deltaY < 0;

    if ((scrollingDown && progress >= 0.98) || (scrollingUp && progress <= 0.02)) {
      return; // Let native scroll handle it — don't trap the user
    }

    event.preventDefault();
    
    const scrollContainer = overlayRef.current;
    if (scrollContainer) {
      scrollContainer.scrollTop += event.deltaY;
    }
  }, []);

  /**
   * Calculates and sets the total scrollable distance for the horizontal project rail.
   * Adjusts the vertical height of the section to map 1:1 with horizontal travel distance,
   * creating a seamless native scroll experience.
   */
  const updateHorizontalTravel = useCallback(() => {
    const section = horizontalSectionRef.current;
    const viewport = horizontalViewportRef.current;
    const track = horizontalTrackRef.current;

    if (!section || !track) return;

    if (window.innerWidth < 1024 || !viewport) {
      horizontalTravelRef.current = 0;
      section.style.removeProperty('height');
      track.style.setProperty('--rail-x', '0px');
      return;
    }

    const currentProgress = useStore.getState().horizontalProgress;
    const paddingOffset = 128; // Accounts for px-16 (64px) on both sides of the viewport
    const travel = Math.max(0, track.scrollWidth - viewport.clientWidth + paddingOffset);
    const sectionHeight = Math.max(window.innerHeight, Math.ceil(window.innerHeight + travel));

    horizontalTravelRef.current = travel;
    section.style.height = `${sectionHeight}px`;
    track.style.setProperty('--rail-x', `${-currentProgress * travel}px`);
  }, []);

  /**
   * Main scroll loop synchronized via requestAnimationFrame.
   * Derives current horizontal progress based on the scroll container's
   * position relative to the horizontal section boundary.
   */
  const updateScrollState = useCallback(() => {
    const scrollContainer = overlayRef.current;
    if (!scrollContainer) return;

    const useWindowScroll = window.innerWidth < 768;
    const scrollTop = useWindowScroll ? window.scrollY : scrollContainer.scrollTop;
    const scrollHeight = useWindowScroll
      ? document.documentElement.scrollHeight - window.innerHeight
      : scrollContainer.scrollHeight - scrollContainer.clientHeight;
    const progress = Math.min(1, Math.max(0, scrollTop / Math.max(1, scrollHeight)));

    // Throttled progress update - only update if significant change
    if (Math.abs(progress - lastScrollProgressRef.current) > PROGRESS_UPDATE_THRESHOLD) {
      lastScrollProgressRef.current = progress;
      setScrollProgress(progress);
    }

    const horizontalSection = horizontalSectionRef.current;
    const railTrack = horizontalTrackRef.current;
    if (horizontalSection && window.innerWidth >= 1024) {
      const rect = horizontalSection.getBoundingClientRect();
      const travelDistance = Math.max(1, horizontalTravelRef.current);
      const hasTravel = horizontalTravelRef.current > 0;
      const segmentProgress = hasTravel
        ? Math.min(1, Math.max(0, -rect.top / travelDistance))
        : 0;
      const inSegment = hasTravel && rect.top <= 0 && rect.bottom >= window.innerHeight;

      // Throttled horizontal progress updates
      if (Math.abs(segmentProgress - lastHorizontalProgressRef.current) > PROGRESS_UPDATE_THRESHOLD) {
        lastHorizontalProgressRef.current = segmentProgress;
        setHorizontalProgress(segmentProgress);
        setLocalRailProgress(segmentProgress);
      }

      const nextScrollMode = inSegment ? 'horizontal' : 'vertical';
      if (lastScrollModeRef.current !== nextScrollMode) {
        lastScrollModeRef.current = nextScrollMode;
        setScrollMode(nextScrollMode);
      }

      railTrack?.style.setProperty('--rail-x', `${-segmentProgress * horizontalTravelRef.current}px`);
      if (inSegment) setActiveSection('projects');
    } else {
      // Reset horizontal progress when leaving section
      if (lastHorizontalProgressRef.current !== 0) {
        lastHorizontalProgressRef.current = 0;
        setHorizontalProgress(0);
        setLocalRailProgress(0);
      }
      if (lastScrollModeRef.current !== 'vertical') {
        lastScrollModeRef.current = 'vertical';
        setScrollMode('vertical');
      }
      railTrack?.style.setProperty('--rail-x', '0px');
    }
  }, [setActiveSection, setHorizontalProgress, setScrollMode, setScrollProgress]);

  useEffect(() => {
    const scrollContainer = overlayRef.current;
    if (!scrollContainer) return;

    let frame = 0;
    let ticking = false;
    let idleFrame = 0;

    const scheduleUpdate = () => {
      if (!ticking) {
        window.cancelAnimationFrame(frame);
        frame = window.requestAnimationFrame(() => {
          updateScrollState();
          ticking = false;
        });
        ticking = true;
      }

      // Schedule one final update after scroll momentum settles
      // Replaces the old 50ms watchdog interval — zero CPU cost when idle
      window.cancelAnimationFrame(idleFrame);
      idleFrame = window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          updateScrollState();
        });
      });
    };

    // Debounced resize handler
    let resizeTimeout: number;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        updateHorizontalTravel();
        scheduleUpdate();
      }, 150);
    };

    updateHorizontalTravel();
    updateScrollState();
    window.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('resize', handleResize, { passive: true });
    scrollContainer.addEventListener('scroll', scheduleUpdate, { passive: true });

    return () => {
      window.cancelAnimationFrame(frame);
      window.cancelAnimationFrame(idleFrame);
      clearTimeout(resizeTimeout);
      window.removeEventListener('scroll', scheduleUpdate);
      window.removeEventListener('resize', handleResize);
      scrollContainer.removeEventListener('scroll', scheduleUpdate);
    };
  }, [updateHorizontalTravel, updateScrollState]);

  useEffect(() => {
    const viewport = horizontalViewportRef.current;
    const track = horizontalTrackRef.current;
    if (!viewport || !track || typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver(() => {
      updateHorizontalTravel();
      updateScrollState();
    });

    observer.observe(viewport);
    observer.observe(track);

    return () => observer.disconnect();
  }, [visibleProjects.length, updateHorizontalTravel, updateScrollState]);

  return (
    <div ref={overlayRef} id="scroll-container" className="ui-overlay">
      <div className="fixed inset-0 z-0 pointer-events-none cyber-grid opacity-70" />

      <main className="relative z-10">


        <SectionShell
          id="hero"
          className="flex flex-col justify-center min-h-screen overflow-hidden px-5 py-16 sm:px-8 sm:py-18 lg:px-16 lg:py-20"
        >
          <div className="pointer-events-none absolute inset-0">
            {heroDots.map((dot) => (
              <span
                key={dot.id}
                className="absolute rounded-full bg-primary"
                style={{
                  left: `${dot.x}`,
                  top: `${dot.y}`,
                  width: `${dot.size}px`,
                  height: `${dot.size}px`,
                  opacity: dot.opacity,
                }}
              />
            ))}
          </div>          
          <div className="mx-auto w-full min-w-0 max-w-screen-xl">
            <motion.div {...reveal} className="max-w-3xl relative z-10">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/8 px-4 py-2 text-xs font-label font-semibold uppercase tracking-[0.18em] text-primary-dim">
                <span className="h-2 w-2 rounded-full bg-primary" />
                Software engineering portfolio
              </div>

              <h1 className="text-4xl font-display font-bold leading-[0.96] text-on-surface sm:text-5xl xl:text-[4.5rem]">
                {personal.name}
                <span className="mt-3 block bg-gradient-to-r from-tertiary via-primary to-primary-dim bg-clip-text text-transparent">
                  {personal.title}
                </span>
              </h1>

              <p className="mt-6 max-w-2xl text-base leading-8 text-on-surface-variant sm:text-lg">
                {personal.tagline} {personal.bio}
              </p>
            </motion.div>

            {/* Global Blur Overlay placed BETWEEN text and buttons */}
            <AnimatePresence>
              {showResumeCue && (
                <motion.div
                  initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
                  animate={{ opacity: 1, backdropFilter: "blur(6px)" }}
                  exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
                  transition={{ duration: 1.2, ease: "easeOut" }}
                  className="fixed inset-0 z-40 bg-surface/40 pointer-events-none"
                />
              )}
            </AnimatePresence>

            <motion.div {...reveal} className={`mt-8 flex flex-col gap-3 sm:flex-row relative ${showResumeCue ? 'z-50' : 'z-10'}`}>
              <button
                type="button"
                onClick={() => document.getElementById('projects')?.scrollIntoView({ behavior: 'smooth' })}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3.5 text-sm font-bold text-on-primary transition hover:bg-primary-dim"
              >
                View projects
                <ArrowRight size={18} />
              </button>
              <a
                href="/resume.pdf"
                className={`relative inline-flex items-center justify-center gap-2 rounded-lg border border-outline-variant bg-surface-container-high/70 px-6 py-3.5 text-sm font-semibold text-on-surface transition hover:border-tertiary/45 hover:text-tertiary group ${
                  showResumeCue ? 'shadow-2xl shadow-surface-highest/50 ring-1 ring-tertiary/30' : ''
                }`}
              >
                <Download size={18} />
                Resume

                {/* Animated Directional Cue */}
                <AnimatePresence>
                  {showResumeCue && (
                    <>
                      {/* ── Mobile / Tablet: downward arrow below the button ── */}
                      <motion.div
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.4, ease: "easeOut" }}
                        className="absolute top-[calc(100%+10px)] left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 pointer-events-none lg:hidden"
                      >
                        <motion.div
                          className="text-[9px] font-label uppercase tracking-[0.2em] text-on-surface/70 font-bold whitespace-nowrap"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.5, duration: 0.5 }}
                        >
                          Download Resume
                        </motion.div>
                        <svg width="24" height="36" viewBox="0 0 24 36" fill="none" stroke="currentColor" className="text-on-surface/60" strokeWidth="1.5" strokeLinecap="round">
                          <motion.line
                            x1="12" y1="0" x2="12" y2="26"
                            initial={{ pathLength: 0, opacity: 0 }}
                            animate={{ pathLength: 1, opacity: 1 }}
                            transition={{ duration: 0.8, delay: 0.8, ease: "easeOut" }}
                          />
                          <motion.path
                            d="M 5 20 L 12 28 L 19 20"
                            strokeLinejoin="round"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.3, delay: 1.6 }}
                          />
                        </svg>
                      </motion.div>

                      {/* ── Desktop: horizontal loop arrow to the right ── */}
                      <motion.div
                        initial={{ opacity: 1 }}
                        exit={{ opacity: 0, scale: 0.95, filter: "blur(4px)" }}
                        transition={{ duration: 0.4, ease: "easeOut" }}
                        className="absolute left-[calc(100%+24px)] top-1/2 -translate-y-1/2 hidden lg:block pointer-events-none w-[160px]"
                      >
                        <svg width="160" height="80" viewBox="0 0 160 80" fill="none" stroke="currentColor" className="text-on-surface/60 overflow-visible">
                          <motion.path
                            d="M 150 15 C 90 15, 90 75, 60 75 C 30 75, 30 25, 60 25 C 90 25, 48 49, 6 49"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            initial={{ pathLength: 0, opacity: 0 }}
                            animate={{ pathLength: 1, opacity: 1 }}
                            transition={{ duration: 1.5, delay: 0.8, ease: "easeInOut" }}
                          />
                          <motion.path
                            d="M 14 43 L 6 49 L 14 55"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.3, delay: 2.3 }}
                          />
                        </svg>
                        <motion.div
                          className="absolute top-[0px] right-[5px] text-[10px] font-label uppercase tracking-[0.2em] text-on-surface/80 font-bold whitespace-nowrap"
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 2.5, duration: 0.5 }}
                        >
                          Download Resume
                        </motion.div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </a>
            </motion.div>

            <motion.div {...reveal} className={`mt-10 grid max-w-2xl gap-3 sm:grid-cols-3 relative ${showResumeCue ? 'z-10' : 'z-10'}`}>
              <Metric value={`${projects.length}+`} label="Projects" />
              <Metric value={`${allSkills.length}+`} label="Skills" />
              <Metric value="3" label="Domains" />
            </motion.div>

            <motion.div {...reveal} className={`mt-7 flex max-w-2xl flex-wrap gap-2 text-xs font-label uppercase tracking-[0.16em] text-on-surface-variant relative ${showResumeCue ? 'z-10' : 'z-10'}`}>
              <span className="rounded-full border border-outline-variant bg-surface-container-high/60 px-3 py-2">
                Practical AI
              </span>
              <span className="rounded-full border border-outline-variant bg-surface-container-high/60 px-3 py-2">
                Full-stack systems
              </span>
              <span className="rounded-full border border-outline-variant bg-surface-container-high/60 px-3 py-2">
                Interactive 3D
              </span>
            </motion.div>
          </div>
        </SectionShell>

        <section
          id="projects"
          ref={horizontalSectionRef}
          className="horizontal-drive relative min-h-screen px-5 pb-16 pt-14 sm:px-8 lg:px-0 lg:pb-0 lg:pt-16"
        >
          <div className="lg:sticky lg:top-16 lg:flex lg:flex-col lg:justify-center lg:h-[calc(100vh-4rem)] lg:overflow-hidden">
            <div className="mx-auto w-full min-w-0 max-w-screen-2xl py-18 lg:max-w-none lg:py-0">
              <div className="px-0 lg:px-16">
                <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                  <SectionHeading
                    eyebrow={sectionCopy.projects.eyebrow}
                    title={sectionCopy.projects.title}
                    copy={sectionCopy.projects.copy}
                  />
                  <a
                    href="https://github.com/AyushBajaj7"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 self-start rounded-lg border border-outline-variant bg-surface-container-high/70 px-5 py-3 text-sm font-semibold text-on-surface transition hover:border-primary/45 hover:text-primary"
                  >
                    <Code2 size={18} />
                    GitHub
                  </a>
                </div>

                <div className="mb-7 flex flex-wrap gap-2">
                  {projectFilters.map((filter) => (
                    <button
                      key={filter}
                      type="button"
                      onClick={() => setProjectFilter(filter)}
                      className={`rounded-lg border px-4 py-2 text-sm font-semibold transition ${
                        projectFilter === filter
                          ? 'border-primary bg-primary text-on-primary'
                          : 'border-outline-variant bg-surface-container-high/65 text-on-surface-variant hover:border-primary/45 hover:text-primary'
                      }`}
                    >
                      {filter}
                    </button>
                  ))}
                </div>
              </div>

              <div ref={horizontalViewportRef} onWheel={handleHorizontalWheel} className="hidden overflow-hidden px-16 lg:block">
                <div className="mb-5 flex items-center justify-between gap-6">
                  <div className="flex items-center gap-3 text-xs font-label uppercase tracking-[0.2em] text-on-surface-variant">
                    <span className="h-2 w-2 rounded-full bg-primary" />
                    Project rail
                  </div>
                  <div className="h-1 w-52 overflow-hidden rounded-full bg-surface-container-high">
                    <motion.div
                      className="h-full bg-gradient-to-r from-primary to-tertiary"
                      style={{ width: `${Math.round(horizontalProgress * 100)}%` }}
                    />
                  </div>
                </div>

                <div className="mb-5 flex items-center justify-between gap-6 text-[11px] font-label uppercase tracking-[0.18em] text-on-surface-variant">
                  <span>
                    {Math.min(
                      visibleProjects.length,
                      Math.max(1, Math.round(horizontalProgress * visibleProjects.length) || 1),
                    )}
                    /{visibleProjects.length} visible
                  </span>
                  <span>{projectFilter === 'All' ? 'All categories' : projectFilter}</span>
                </div>

                <div ref={horizontalTrackRef} className="horizontal-track flex w-max items-stretch gap-6 pb-4">
                  <div className="surface-panel flex h-auto min-h-[20rem] w-[min(56vw,340px)] flex-none flex-col justify-between rounded-xl p-6">
                    <div>
                      <p className="text-xs font-label uppercase tracking-[0.22em] text-primary-dim">
                        Overview
                      </p>
                      <h3 className="mt-4 text-2xl font-display font-bold leading-tight text-on-surface">
                        Real projects with technical context.
                      </h3>
                    </div>
                    <p className="max-w-sm text-sm leading-7 text-on-surface-variant">
                      Four projects with scope, stack, and implementation notes.
                    </p>
                  </div>

                  {visibleProjects.map((project, index) => (
                    <div key={project.id} className="flex w-[min(56vw,340px)] flex-none flex-col">
                      <ProjectCard project={project} index={index} rail />
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() => document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' })}
                    className="surface-panel group flex h-auto min-h-[18rem] max-h-[22rem] w-[min(56vw,340px)] flex-none flex-col justify-between rounded-xl p-6 text-left transition hover:border-primary/45"
                  >
                    <span className="text-xs font-label uppercase tracking-[0.22em] text-primary-dim">Next</span>
                    <span className="text-2xl font-display font-bold leading-tight text-on-surface">
                      Continue to profile and skills.
                    </span>
                    <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary text-on-primary transition group-hover:translate-x-2">
                      <ArrowRight size={22} />
                    </span>
                  </button>
                </div>
              </div>

              <div className="grid gap-5 md:grid-cols-2 lg:hidden">
                {visibleProjects.map((project, index) => (
                  <ProjectCard key={project.id} project={project} index={index} />
                ))}
              </div>
            </div>
          </div>
        </section>

        <SectionShell id="about" className="px-5 py-24 sm:px-8 lg:px-16 lg:py-30">
          <div className="mx-auto grid max-w-screen-2xl gap-10 lg:grid-cols-[0.5fr_0.5fr] lg:items-start">
            <SectionHeading
              eyebrow={sectionCopy.about.eyebrow}
              title={sectionCopy.about.title}
              copy={personal.about}
            />

            <motion.div {...reveal} className="grid gap-4">
              <div className="surface-panel rounded-xl p-6">
                <div className="mb-4 flex items-center gap-3 text-primary">
                  <MapPin size={20} />
                  <span className="text-sm font-semibold text-on-surface">{personal.location}</span>
                </div>
                <p className="text-sm leading-7 text-on-surface-variant">
                  I prefer work where the interface, logic, and delivery path have to hold together, not just look polished in isolation.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <Metric value="AI" label="Pipelines" />
                <Metric value="Web" label="Platforms" />
                <Metric value="3D" label="Systems" />
              </div>
              <div className="surface-panel-subtle rounded-xl p-6">
                <div className="grid gap-3 text-sm leading-7 text-on-surface-variant">
                  <div className="flex items-start gap-3">
                    <Check size={16} className="mt-1 text-primary-dim" />
                    <span>Prefer implementation that can be explained clearly and maintained without ceremony.</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <Check size={16} className="mt-1 text-primary-dim" />
                    <span>Use interaction and animation to support the content, not compete with it.</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <Check size={16} className="mt-1 text-primary-dim" />
                    <span>Work across frontend, backend, and ML pieces when the product problem needs all three.</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </SectionShell>

        <SectionShell id="skills" className="px-5 py-24 sm:px-8 lg:px-16 lg:py-30">
          <div className="mx-auto max-w-screen-2xl">
            <SectionHeading
              eyebrow={sectionCopy.skills.eyebrow}
              title={sectionCopy.skills.title}
              copy={sectionCopy.skills.copy}
            />

            <div className="mt-12 grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
              {skills.map((group, index) => (
                <SkillCard key={group.category} group={group} index={index} />
              ))}
            </div>
          </div>
        </SectionShell>

        <SectionShell id="contact" className="px-5 py-24 sm:px-8 lg:px-16 lg:py-30">
          <div className="mx-auto grid max-w-screen-2xl gap-10 lg:grid-cols-[0.54fr_0.46fr] lg:items-center">
            <SectionHeading
              eyebrow={sectionCopy.contact.eyebrow}
              title={sectionCopy.contact.title}
              copy={sectionCopy.contact.copy}
            />

            <motion.div {...reveal} className="surface-panel rounded-xl p-6 sm:p-8">
              <div className="mb-8">
                <p className="text-xs font-label uppercase tracking-[0.2em] text-on-surface-variant">Email</p>
                <a
                  href={`mailto:${personal.email}`}
                  className="mt-2 block text-xl font-display font-bold text-on-surface transition hover:text-primary sm:text-2xl"
                >
                  {personal.email}
                </a>
              </div>

              <ContactActions email={personal.email} />

              <div className="mt-8 flex flex-wrap gap-3 border-t border-outline-variant pt-6">
                {socials.map((social) => {
                  const Icon = socialIcons[social.icon as keyof typeof socialIcons] ?? ExternalLink;
                  return (
                    <a
                      key={social.platform}
                      href={social.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-lg border border-outline-variant bg-surface/40 px-4 py-2.5 text-sm font-semibold text-on-surface-variant transition hover:border-primary/45 hover:text-primary"
                    >
                      <Icon size={17} />
                      {social.platform}
                    </a>
                  );
                })}
              </div>
            </motion.div>
          </div>
        </SectionShell>
      </main>
    </div>
  );
};
