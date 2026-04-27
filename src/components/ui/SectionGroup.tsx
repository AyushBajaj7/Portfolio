import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import {
  ArrowRight,
  Check,
  Code2,
  Copy,
  Download,
  ExternalLink,
  Mail,
  MapPin,
  Server,
  Sparkles,
  Terminal,
  Layers3,
} from 'lucide-react';
import portfolioData from '../../data/portfolio.json';
import { useStore } from '../../store/useStore';

type Project = (typeof portfolioData.projects)[number];
type SkillGroup = (typeof portfolioData.skills)[number];

const reveal = {
  initial: { opacity: 0, y: 28 },
  whileInView: { opacity: 1, y: 0 },
  transition: { duration: 0.55, ease: 'easeOut' as const },
  viewport: { once: true, amount: 0.18 },
};

const skillIcons = [Code2, Server, Sparkles, Layers3];

const getCodePreviewExcerpt = (preview: string) => preview.trim().split('\n').slice(0, 6).join('\n');

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
  twitter: ExternalLink,
};

const particles = Array.from({ length: 18 }, (_, index) => ({
  id: index,
  x: (index * 37) % 100,
  y: (index * 53) % 100,
  size: 2 + (index % 4),
  drift: index % 2 === 0 ? 18 : -18,
  duration: 12 + (index % 6),
  delay: (index % 5) * 0.35,
}));

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

const SectionShell: React.FC<{
  id: string;
  children: React.ReactNode;
  className?: string;
}> = ({ id, children, className = '' }) => {
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, { amount: 0.35 });
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
}> = ({ eyebrow, title, copy }) => (
  <motion.div {...reveal} className="max-w-3xl">
    <p className="mb-3 text-xs font-label font-semibold uppercase tracking-[0.24em] text-primary-dim">
      {eyebrow}
    </p>
    <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold leading-tight text-on-surface">
      {title}
    </h2>
    {copy && <p className="mt-4 text-base sm:text-lg leading-8 text-on-surface-variant">{copy}</p>}
  </motion.div>
);

const Metric: React.FC<{ value: string; label: string }> = ({ value, label }) => (
  <div className="rounded-lg border border-outline-variant bg-surface/72 p-4">
    <div className="text-2xl font-display font-bold text-on-surface">{value}</div>
    <div className="mt-1 text-[11px] font-label uppercase tracking-[0.18em] text-on-surface-variant">
      {label}
    </div>
  </div>
);

const ProjectCard: React.FC<{ project: Project; index: number }> = ({ project, index }) => {
  const accent = index % 2 === 0 ? 'from-primary/25' : 'from-tertiary/25';

  return (
    <motion.a
      {...reveal}
      href={project.link}
      target="_blank"
      rel="noreferrer"
      data-cursor="view"
      className="project-card group grid min-h-[340px] overflow-hidden rounded-lg border border-outline-variant bg-surface/88 transition-[transform,border-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-[0_16px_42px_rgba(0,0,0,0.22)]"
    >
      <div className={`relative min-h-[132px] bg-gradient-to-br ${accent} via-surface-container-high to-surface`}>
        <img
          src={`/frames/male${String(index * 18 + 1).padStart(4, '0')}.png`}
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-top opacity-18 grayscale transition duration-300 group-hover:scale-[1.02] group-hover:opacity-24"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-surface-container-high via-transparent to-transparent" />
        <div className="absolute left-5 top-5 rounded-full border border-outline-variant bg-surface/72 px-3 py-1 text-xs font-label uppercase tracking-[0.18em] text-on-surface-variant">
          0{index + 1}
        </div>
        <div className="absolute right-5 top-5 flex h-10 w-10 items-center justify-center rounded-full border border-outline-variant bg-surface/72 text-on-surface transition group-hover:border-primary/45 group-hover:text-primary">
          <ExternalLink size={18} />
        </div>
      </div>

      <div className="flex flex-col p-6">
        <p className="text-xs font-label uppercase tracking-[0.18em] text-primary-dim">{project.subtitle}</p>
        <h3 className="mt-3 text-2xl font-display font-bold leading-tight text-on-surface">
          {project.title}
        </h3>
        <p className="mt-4 flex-1 text-sm leading-7 text-on-surface-variant">{project.description}</p>
        {project.codePreview && (
          <div className="relative mt-5 overflow-hidden rounded-lg border border-outline-variant bg-surface/92">
            <div className="flex items-center justify-between border-b border-outline-variant px-4 py-2">
              <span className="text-[10px] font-label uppercase tracking-[0.18em] text-on-surface-variant">
                Implementation
              </span>
              <span className="text-[10px] font-label uppercase tracking-[0.18em] text-primary-dim">
                {project.codePreview.trim().split('\n').length} lines
              </span>
            </div>
            <pre className="max-h-32 overflow-hidden px-4 py-3 text-[11px] leading-5 text-on-surface-variant">
              <code>{getCodePreviewExcerpt(project.codePreview)}</code>
            </pre>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-surface to-transparent" />
          </div>
        )}
        <div className="mt-6 flex flex-wrap gap-2">
          {project.tech.slice(0, 5).map((tech) => (
            <span
              key={tech}
              className="rounded-full border border-outline-variant bg-surface/45 px-3 py-1 text-xs text-on-surface-variant"
            >
              {tech}
            </span>
          ))}
        </div>
      </div>
    </motion.a>
  );
};

const SkillCard: React.FC<{ group: SkillGroup; index: number }> = ({ group, index }) => {
  const Icon = skillIcons[index % skillIcons.length];

  return (
    <motion.div
      {...reveal}
      className="rounded-lg border border-outline-variant bg-surface/84 p-6"
    >
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-primary/20 bg-primary/8 text-primary">
          <Icon size={21} />
        </div>
        <h3 className="text-xl font-display font-bold text-on-surface">{group.category}</h3>
      </div>
      <div className="grid gap-3">
        {group.items.map((item) => (
          <div key={item} className="flex items-center gap-3 text-base leading-7 text-on-surface-variant">
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
        className="inline-flex items-center justify-center gap-2 rounded-lg border border-primary/25 bg-primary/14 px-5 py-3 text-sm font-semibold text-primary transition hover:bg-primary/20"
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
  const pageProgressRef = useRef(0);
  const railProgressRef = useRef(0);
  const scrollModeRef = useRef<'vertical' | 'horizontal'>('vertical');
  const setScrollProgress = useStore((state) => state.setScrollProgress);
  const setHorizontalProgress = useStore((state) => state.setHorizontalProgress);
  const setScrollMode = useStore((state) => state.setScrollMode);
  const setActiveSection = useStore((state) => state.setActiveSection);
  const [projectFilter, setProjectFilter] = useState('All');
  const [horizontalProgress, setLocalHorizontalProgress] = useState(0);

  const allSkills = useMemo(() => skills.flatMap((group) => group.items), [skills]);
  const projectFilters = useMemo(
    () => ['All', ...Array.from(new Set(projects.map(getProjectCategory)))],
    [projects]
  );
  const visibleProjects = useMemo(
    () => projects.filter((project) => projectFilter === 'All' || getProjectCategory(project) === projectFilter),
    [projectFilter, projects]
  );

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
    const travel = Math.max(0, track.scrollWidth - viewport.clientWidth);
    const sectionHeight = Math.max(window.innerHeight, Math.ceil(window.innerHeight + travel));

    horizontalTravelRef.current = travel;
    section.style.height = `${sectionHeight}px`;
    track.style.setProperty('--rail-x', `${-currentProgress * travel}px`);
  }, []);

  const updateScrollState = useCallback(() => {
    const scrollContainer = overlayRef.current;
    if (!scrollContainer) return;

    const useWindowScroll = window.innerWidth < 768;
    const scrollTop = useWindowScroll ? window.scrollY : scrollContainer.scrollTop;
    const scrollHeight = useWindowScroll
      ? document.documentElement.scrollHeight - window.innerHeight
      : scrollContainer.scrollHeight - scrollContainer.clientHeight;
    const progress = Math.min(1, Math.max(0, scrollTop / Math.max(1, scrollHeight)));

    if (Math.abs(progress - pageProgressRef.current) > 0.001) {
      pageProgressRef.current = progress;
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

      setLocalHorizontalProgress((prev) => (Math.abs(prev - segmentProgress) > 0.002 ? segmentProgress : prev));
      if (Math.abs(segmentProgress - railProgressRef.current) > 0.002) {
        railProgressRef.current = segmentProgress;
        setHorizontalProgress(segmentProgress);
      }

      const nextScrollMode = inSegment ? 'horizontal' : 'vertical';
      if (scrollModeRef.current !== nextScrollMode) {
        scrollModeRef.current = nextScrollMode;
        setScrollMode(nextScrollMode);
      }

      railTrack?.style.setProperty('--rail-x', `${-segmentProgress * horizontalTravelRef.current}px`);
      if (inSegment) setActiveSection('projects');
    } else {
      setLocalHorizontalProgress((prev) => (prev === 0 ? prev : 0));
      if (railProgressRef.current !== 0) {
        railProgressRef.current = 0;
        setHorizontalProgress(0);
      }
      if (scrollModeRef.current !== 'vertical') {
        scrollModeRef.current = 'vertical';
        setScrollMode('vertical');
      }
      railTrack?.style.setProperty('--rail-x', '0px');
    }
  }, [
    setActiveSection,
    setHorizontalProgress,
    setScrollMode,
    setScrollProgress,
  ]);

  useEffect(() => {
    const scrollContainer = overlayRef.current;
    if (!scrollContainer) return;

    let frame = 0;

    const scheduleUpdate = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(updateScrollState);
    };

    updateHorizontalTravel();
    updateScrollState();
    window.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('resize', updateHorizontalTravel);
    window.addEventListener('resize', scheduleUpdate);
    scrollContainer.addEventListener('scroll', scheduleUpdate, { passive: true });

    const refreshTravel = window.setTimeout(() => {
      updateHorizontalTravel();
      scheduleUpdate();
    }, 250);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(refreshTravel);
      window.removeEventListener('scroll', scheduleUpdate);
      window.removeEventListener('resize', updateHorizontalTravel);
      window.removeEventListener('resize', scheduleUpdate);
      scrollContainer.removeEventListener('scroll', scheduleUpdate);
    };
  }, [
    setActiveSection,
    setHorizontalProgress,
    setScrollMode,
    setScrollProgress,
    updateHorizontalTravel,
    updateScrollState,
  ]);

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
  }, [
    visibleProjects.length,
    updateHorizontalTravel,
    updateScrollState,
  ]);

  return (
    <div ref={overlayRef} id="scroll-container" className="ui-overlay">
      <div className="fixed inset-0 pointer-events-none z-0 cyber-grid opacity-70" />

      <main className="relative z-10">
        <SectionShell id="hero" className="flex min-h-screen items-center overflow-hidden px-5 py-24 sm:px-8 lg:px-16">
          <div className="absolute inset-0 pointer-events-none">
            {particles.map((particle) => (
              <motion.span
                key={particle.id}
                className="absolute rounded-full bg-primary/50"
                style={{
                  left: `${particle.x}%`,
                  top: `${particle.y}%`,
                  width: particle.size,
                  height: particle.size,
                }}
                animate={{ x: [0, particle.drift, 0], y: [0, -28, 0], opacity: [0.16, 0.42, 0.16] }}
                transition={{
                  duration: particle.duration,
                  delay: particle.delay,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />
            ))}
          </div>

          <div className="mx-auto grid w-full max-w-screen-2xl gap-10 lg:grid-cols-[minmax(0,0.58fr)_minmax(280px,0.42fr)] lg:items-center">
            <motion.div {...reveal} className="max-w-4xl">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/8 px-4 py-2 text-xs font-label font-semibold uppercase tracking-[0.18em] text-primary-dim">
                <span className="h-2 w-2 rounded-full bg-primary shadow-[0_0_16px_var(--primary)]" />
                College student portfolio
              </div>
              <h1 className="text-5xl font-display font-bold leading-[0.98] tracking-normal text-on-surface sm:text-6xl lg:text-8xl">
                {personal.name}
                <span className="mt-3 block bg-gradient-to-r from-tertiary via-primary to-primary-dim bg-clip-text text-transparent">
                  {personal.title}
                </span>
              </h1>
              <p className="mt-7 max-w-2xl text-lg leading-8 text-on-surface-variant sm:text-xl">
                {personal.tagline} {personal.bio}
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
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
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-outline-variant bg-surface-container-high/70 px-6 py-3.5 text-sm font-semibold text-on-surface transition hover:border-tertiary/45 hover:text-tertiary"
                >
                  <Download size={18} />
                  Resume
                </a>
              </div>

              <div className="mt-10 grid max-w-xl grid-cols-3 gap-3">
                <Metric value={`${projects.length}+`} label="Projects" />
                <Metric value={`${allSkills.length}+`} label="Skills" />
                <Metric value="College" label="Student" />
              </div>

              <div className="mt-8 flex max-w-xl flex-wrap gap-2 text-xs font-label uppercase tracking-[0.16em] text-on-surface-variant">
                <span className="rounded-full border border-outline-variant bg-surface-container-high/55 px-3 py-2">
                  AI Pipelines
                </span>
                <span className="rounded-full border border-outline-variant bg-surface-container-high/55 px-3 py-2">
                  Full Stack
                </span>
                <span className="rounded-full border border-outline-variant bg-surface-container-high/55 px-3 py-2">
                  Interactive 3D
                </span>
              </div>
            </motion.div>

            <motion.div {...reveal} className="hidden xl:block">
              <div className="ml-auto max-w-md rounded-lg border border-outline-variant bg-surface/82 p-6">
                <div className="mb-5 flex items-center gap-3 text-primary">
                  <Terminal size={22} />
                  <span className="text-xs font-label uppercase tracking-[0.22em]">Current focus</span>
                </div>
                <div className="space-y-4 text-sm leading-7 text-on-surface-variant">
                  <p>Full-stack systems, practical AI pipelines, and interactive 3D web experiences.</p>
                  <p>Built with React, Node.js, Python, cloud tooling, and animation systems that stay usable.</p>
                </div>
              </div>
            </motion.div>
          </div>
        </SectionShell>

        <section
          id="projects"
          ref={horizontalSectionRef}
          className="horizontal-drive relative min-h-screen px-5 sm:px-8 lg:px-0"
        >
          <div className="lg:sticky lg:top-0 lg:flex lg:h-screen lg:items-center lg:overflow-hidden">
            <div className="mx-auto w-full max-w-screen-2xl py-24 lg:max-w-none lg:py-0">
              <div className="px-0 lg:px-16">
                <div className="mb-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                  <SectionHeading
                    eyebrow="Selected work"
                    title="Projects from the portfolio data."
                    copy="A focused set of full-stack, AI, data, and visualization projects with clear implementation scope."
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

              <div ref={horizontalViewportRef} className="hidden overflow-hidden px-16 lg:block">
                <div className="mb-5 flex items-center justify-between gap-6">
                  <div className="flex items-center gap-3 text-xs font-label uppercase tracking-[0.2em] text-on-surface-variant">
                    <span className="h-2 w-2 rounded-full bg-primary shadow-[0_0_18px_var(--primary)]" />
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
                      Math.max(1, Math.round(horizontalProgress * visibleProjects.length) || 1)
                    )}
                    /{visibleProjects.length} visible
                  </span>
                  <span>{projectFilter === 'All' ? 'All categories' : projectFilter}</span>
                </div>

                <div
                  ref={horizontalTrackRef}
                  className="horizontal-track flex w-max items-stretch gap-5"
                >
                  <div className="flex h-[58vh] w-[40vw] min-w-[420px] flex-col justify-between rounded-lg border border-outline-variant bg-surface/84 p-8">
                    <div>
                      <p className="text-xs font-label uppercase tracking-[0.22em] text-primary-dim">
                        Portfolio work
                      </p>
                      <h3 className="mt-4 text-4xl font-display font-bold leading-none text-on-surface">
                        Full-stack, AI/ML, and interactive systems.
                      </h3>
                    </div>
                    <p className="max-w-md text-sm leading-7 text-on-surface-variant">
                      Projects cover an agricultural web platform, an AI video pipeline, disease prediction, and 3D architecture visualization.
                    </p>
                  </div>

                  {visibleProjects.map((project, index) => (
                    <div key={project.id} className="w-[min(78vw,430px)] flex-none">
                      <ProjectCard project={project} index={index} />
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() => document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' })}
                    className="group flex h-[58vh] w-[32vw] min-w-[360px] flex-none flex-col justify-between rounded-lg border border-primary/25 bg-surface/78 p-8 text-left transition hover:border-primary/45"
                  >
                    <span className="text-xs font-label uppercase tracking-[0.22em] text-primary-dim">Next</span>
                    <span className="text-4xl font-display font-bold leading-tight text-on-surface">
                      Continue into the profile.
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

        <SectionShell id="about" className="px-5 py-24 sm:px-8 lg:px-16 lg:py-32">
          <div className="mx-auto grid max-w-screen-2xl gap-10 lg:grid-cols-[0.48fr_0.52fr] lg:items-start">
            <SectionHeading
              eyebrow="About"
              title="A developer profile with breadth and execution depth."
              copy={personal.about}
            />

            <motion.div {...reveal} className="grid gap-4">
              <div className="rounded-lg border border-outline-variant bg-surface/84 p-6">
                <div className="mb-4 flex items-center gap-3 text-primary">
                  <MapPin size={20} />
                  <span className="text-sm font-semibold text-on-surface">{personal.location}</span>
                </div>
                <p className="text-sm leading-7 text-on-surface-variant">
                  I build practical applications where the interface, data model, and deployment path all need to work together.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <Metric value="AI" label="Pipelines" />
                <Metric value="Web" label="Platforms" />
                <Metric value="3D" label="Interactive" />
              </div>
            </motion.div>
          </div>
        </SectionShell>

        <SectionShell id="skills" className="px-5 py-24 sm:px-8 lg:px-16 lg:py-32">
          <div className="mx-auto max-w-screen-2xl">
            <SectionHeading
              eyebrow="Capabilities"
              title="Tools organized by how they are used."
              copy="The stack spans product interfaces, backend APIs, machine-learning workflows, and cloud deployment."
            />

            <div className="mt-12 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
              {skills.map((group, index) => (
                <SkillCard key={group.category} group={group} index={index} />
              ))}
            </div>

            <div className="mt-10 overflow-hidden border-y border-outline-variant py-5">
              <div className="animate-marquee flex w-max gap-3">
                {[...allSkills, ...allSkills].map((skill, index) => (
                  <span
                    key={`${skill}-${index}`}
                    className="rounded-full border border-outline-variant bg-surface/72 px-4 py-2 text-[15px] text-on-surface-variant"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </SectionShell>

        <SectionShell id="contact" className="px-5 py-24 sm:px-8 lg:px-16 lg:py-32">
          <div className="mx-auto grid max-w-screen-2xl gap-10 lg:grid-cols-[0.54fr_0.46fr] lg:items-center">
            <SectionHeading
              eyebrow="Contact"
              title="Ready to discuss a build, role, or collaboration."
              copy="Send a message with the context, timeline, and goals. I prefer direct briefs and clear next steps."
            />

            <motion.div
              {...reveal}
              className="rounded-lg border border-outline-variant bg-surface/88 p-6 sm:p-8"
            >
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
