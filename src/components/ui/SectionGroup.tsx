/**
 * @fileoverview SectionGroup component - Main content sections for the portfolio.
 * Handles hero, projects (with horizontal scroll on desktop), about, skills, and contact sections.
 * Implements scroll-driven animations, project filtering, and responsive layouts.
 * @author Ayush Bajaj
 */

import React, { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useMotionPreference } from '../../lib/useMotionPreference';
import {
  AlertCircle,
  ArrowRight,
  Briefcase,
  Calendar,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Code2,
  Copy,
  Cpu,
  Download,
  ExternalLink,
  FileText,
  Grid,
  Layers3,
  Loader2,
  MapPin,
  Send,
  Server,
  SlidersHorizontal,
  Sparkles,
  Terminal,
  X,
  Zap,
} from 'lucide-react';
import portfolioData from '../../data/portfolio.json';
import { useStore } from '../../store/useStore';
import { TiltCard } from './TiltCard';
import { ProjectEvidence, SelectedWorkLinks } from './ProjectEvidence';

const TerminalModal = lazy(() => import('./TerminalModal').then((module) => ({ default: module.TerminalModal })));
const BlastRadiusSimulator = lazy(() => import('./BlastRadiusSimulator').then((module) => ({ default: module.BlastRadiusSimulator })));
const CatXTelemetryWidget = lazy(() => import('./CatXTelemetryWidget').then((module) => ({ default: module.CatXTelemetryWidget })));
const TradersErpSimulator = lazy(() => import('./TradersErpSimulator').then((module) => ({ default: module.TradersErpSimulator })));
const ArchitectureViewer3D = lazy(() => import('./ArchitectureViewer3D').then((module) => ({ default: module.ArchitectureViewer3D })));

type Project = (typeof portfolioData.projects)[number];
type SkillGroup = (typeof portfolioData.skills)[number];
type ResumeCueGeometry = {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  controlOneX: number;
  controlOneY: number;
  controlTwoX: number;
  controlTwoY: number;
};

// Constants for scroll and animation thresholds
const SECTION_VIEWPORT_THRESHOLD = 0.14;

const reveal = {
  initial: { opacity: 0, y: 28 },
  whileInView: { opacity: 1, y: 0 },
  transition: { duration: 0.56, ease: [0.22, 1, 0.36, 1] as [number,number,number,number] },
  viewport: { once: true, amount: SECTION_VIEWPORT_THRESHOLD },
};

const revealFast = {
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  transition: { duration: 0.38, ease: [0.22, 1, 0.36, 1] as [number,number,number,number] },
  viewport: { once: true, amount: SECTION_VIEWPORT_THRESHOLD },
};

const skillIcons = [Code2, Server, Sparkles, Layers3];

const CATEGORY_COLORS: Record<string, string> = {
  'AI / ML':     'text-tertiary border-tertiary/30 bg-tertiary/8',
  'Applied AI':  'text-tertiary border-tertiary/30 bg-tertiary/8',
  '3D Systems':  'text-[var(--category-violet)] border-[var(--category-violet-border)] bg-[var(--category-violet-bg)]',
  'Full Stack':  'text-primary-dim border-primary/30 bg-primary/8',
};

const sectionCopy = {
  projects: {
    eyebrow: 'Selected work / 01',
    title: 'The engineering behind the interface.',
    copy: 'Explore the problem, implementation and source. Start with distributed systems, operator intelligence and transactional workflows.',
  },
  about: {
    eyebrow: 'Experience & education / 02',
    title: 'A builder across the stack.',
  },
  skills: {
    eyebrow: 'Technical toolkit / 03',
    title: 'Tools with a purpose.',
    copy: 'Backend and applied AI at the core. Frontend and delivery skills to carry a system through to a usable product.',
  },
  contact: {
    eyebrow: 'Get in touch / 04',
    title: 'Let’s build something useful.',
    copy: 'Hiring for software engineering, backend or applied-AI work? I’d like to hear about your team.',
  },
};

const capabilitySummaries: Record<string, string> = {
  'Distributed & Backend Systems': 'Microservices, graph and vector databases, and real-time APIs.',
  'Applied AI & Machine Learning': 'LLM orchestration, RAG pipelines, AST analysis, and model evaluation.',
  'Frontend Engineering':          'Responsive interfaces, component systems, and interaction states.',
  'Cloud & DevOps':                'Containerized deployments, media pipelines, and automated workflows.',
  'Engineering Foundations':       'Distributed systems design, algorithms, and deep technical problem solving.',
  'Backend Systems':               'API design, application logic, and structured data handling.',
  'Applied AI':                    'Model workflows, evaluation, and production-minded ML usage.',
  'Deployment & Media':            'Cloud delivery, media processing, and 3D asset workflows.',
};

const getProjectCategory = (project: Project) => {
  if ('category' in project && typeof project.category === 'string') {
    return project.category;
  }
  const s = `${project.title} ${project.subtitle} ${project.tech.join(' ')}`.toLowerCase();
  if (/\b(ai|ml|nlp|gemini|flan|transformers?|predictive|disease|drift|rag|chroma)\b/i.test(s) || s.includes('cat-x') || s.includes('trajectory') || s.includes('summary') || s.includes('mdt')) return 'AI / ML';
  if (/\b(3d|unity|opengl|blender)\b/i.test(s)) return '3D Systems';
  return 'Full Stack';
};

const getCodePreviewLines = (preview: string, limit = 4) =>
  preview.trim().split('\n').map(l => l.trim()).filter(Boolean).slice(0, limit);

const getCodePreviewLineCount = (preview: string) =>
  preview.trim().split('\n').map(l => l.trim()).filter(Boolean).length;

const getResumeCuePath = (g: ResumeCueGeometry) =>
  `M ${g.startX} ${g.startY} C ${g.controlOneX} ${g.controlOneY}, ${g.controlTwoX} ${g.controlTwoY}, ${g.endX} ${g.endY}`;

const getProjectSlug = (project: Project) =>
  project.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

const getProjectDemo = (project: Project): string | null =>
  'demo' in project && typeof project.demo === 'string' ? project.demo : null;

const scrollToSection = (id: string) => {
  const section = document.getElementById(id);
  if (!section) return;
  const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
  section.scrollIntoView({ behavior, block: 'start' });
};

const getImplementationFocus = (project: Project) => ({
  1: 'AST analysis & dependency graphs', 2: 'Telemetry & trajectory simulation',
  10: 'Transactional stock & ledger updates', 7: 'Agricultural data integration',
  3: 'Presentation-to-video pipeline', 4: 'Commerce & SQL aggregation',
  6: 'Weather data proxy & visualization', 9: 'Multimodal document summarization',
  5: 'Gene-expression classification', 11: 'Email features & NLP classification',
  8: 'Interactive 3D walkthrough',
} as Record<number, string>)[project.id] ?? 'Implementation snapshot';

const getProjectScopeNotes = (project: Project) => [
  { label: 'Scope',    value: project.subtitle },
  { label: 'Category', value: getProjectCategory(project) },
  { label: 'Stack',    value: project.tech.slice(0, 4).join(', ') },
  ...('sourceAccess' in project && project.sourceAccess === 'private'
    ? [{ label: 'Source access', value: 'Private repository' }]
    : []),
];

// ─── SVG marks ───────────────────────────────────────────────────────────────

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

const socialIcons = { github: GithubMark, linkedin: LinkedinMark };

// ─── Shared sub-components ───────────────────────────────────────────────────

const SectionShell: React.FC<{
  id: string;
  children: React.ReactNode;
  className?: string;
}> = ({ id, children, className = '' }) => (
  <section id={id} aria-label={id === 'hero' ? 'Introduction' : id[0].toUpperCase() + id.slice(1)} className={`portfolio-section relative ${className}`}>
    {children}
  </section>
);

const SectionHeading: React.FC<{
  eyebrow: string;
  title: string;
  copy?: string;
  className?: string;
}> = React.memo(({ eyebrow, title, copy, className = '' }) => (
  <motion.div {...reveal} className={`max-w-3xl ${className}`}>
    <p className="mb-3 text-[11px] font-label font-semibold uppercase tracking-[0.26em] text-primary-dim">
      {eyebrow}
    </p>
    <h2 className="text-3xl font-display font-bold leading-tight tracking-[-0.025em] text-on-surface sm:text-4xl [text-wrap:balance]">
      {title}
    </h2>
    {copy && (
      <p className="mt-4 max-w-[62ch] text-base leading-7 text-on-surface-variant sm:text-lg sm:leading-8">
        {copy}
      </p>
    )}
  </motion.div>
));

const ProjectCard: React.FC<{
  project: Project;
  index: number;
  rail?: boolean;
  onOpenCaseStudy?: (project: Project) => void;
}> = React.memo(({ project, index, rail = false, onOpenCaseStudy }) => {
  const previewLines = project.codePreview ? getCodePreviewLines(project.codePreview, rail ? 1 : 4) : [];
  const totalLines = project.codePreview ? getCodePreviewLineCount(project.codePreview) : 0;
  const slug = getProjectSlug(project);
  const demo = getProjectDemo(project);
  const category = getProjectCategory(project);
  const categoryStyle = CATEGORY_COLORS[category] ?? 'text-on-surface-variant border-outline-variant bg-transparent';

  const openFromCard = (event: React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>) => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim().length > 0) return;
    if ((event.target as HTMLElement).closest('a, button, input, textarea, select')) return;
    event.preventDefault();
    onOpenCaseStudy?.(project);
  };

  const cardContent = (
    <div className={`flex h-full flex-col relative z-10 ${rail ? 'p-4' : 'p-5 lg:p-6'}`}>
      {/* Header row */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-outline-variant bg-surface/50 px-2.5 py-0.5 text-[10px] font-label font-semibold uppercase tracking-[0.2em] text-on-surface-variant">
            {String(index + 1).padStart(2, '0')}
          </span>
          <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-label uppercase tracking-[0.16em] ${categoryStyle}`}>
            {category}
          </span>
        </div>
        {rail && (
          <div className="flex items-center gap-1.5">
            <a
              href={`#project-${slug}`}
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onOpenCaseStudy?.(project); }}
              data-cursor="view"
              aria-label={`Open ${project.title} case study`}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-outline-variant bg-surface/50 text-on-surface-variant transition hover:border-primary/40 hover:text-primary"
            >
              <FileText size={14} />
            </a>
            {!('sourceAccess' in project && project.sourceAccess === 'private') && (<a
              href={project.link}
              target="_blank"
              rel="noreferrer"
              data-cursor="view"
              aria-label={`Open ${project.title} source`}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-outline-variant bg-surface/50 text-on-surface-variant transition hover:border-primary/40 hover:text-primary"
            >
              <ExternalLink size={14} />
            </a>)}
            {demo && (
              <a
                href={demo}
                target="_blank"
                rel="noreferrer"
                data-cursor="view"
                aria-label={`Open ${project.title} live demo`}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-primary/28 bg-primary/10 text-primary transition hover:border-primary/55 hover:bg-primary/18"
              >
                <Zap size={14} />
              </a>
            )}
          </div>
        )}
      </div>

      {/* Subtitle + title */}
      <p className={`${rail ? 'text-[10px]' : 'text-[11px]'} font-label uppercase tracking-[0.20em] text-primary-dim`}>
        {project.subtitle}
      </p>
      <h3 className="mt-2.5 text-xl font-display font-bold leading-tight text-on-surface">
        {project.title}
      </h3>
      <p className="mt-3 flex-1 text-sm leading-6 text-on-surface-variant">
        {project.description}
      </p>

      {/* Code preview block */}
      {previewLines.length > 0 && (
        <div className={`${rail ? 'mt-3' : 'mt-4'} overflow-hidden rounded-xl border border-outline-variant bg-surface/60`}>
          <div className={`flex items-center justify-between gap-3 ${rail ? 'px-3 py-2' : 'border-b border-outline-variant px-4 py-2.5'}`}>
            <div>
              <p className="text-[9px] font-label uppercase tracking-[0.20em] text-on-surface-variant/70">
                {getImplementationFocus(project)}
              </p>
            </div>
            <span className="rounded-full border border-outline-variant/60 px-2 py-0.5 text-[9px] font-label uppercase tracking-[0.14em] text-on-surface-variant/60">
              {totalLines}L
            </span>
          </div>
          {!rail && (
            <div className="pointer-events-none select-none px-4 py-3 font-mono">
              {previewLines.map((line, li) => (
                <div
                  key={`${project.id}-${li}`}
                  className={`grid grid-cols-[22px_minmax(0,1fr)] gap-3 py-1.5 ${li > 0 ? 'border-t border-outline-variant/40' : ''}`}
                >
                  <span className="text-[9px] font-label tabular-nums text-on-surface-variant/50 select-none">
                    {li + 1}
                  </span>
                  <code className="block overflow-hidden text-ellipsis whitespace-nowrap text-[11px] leading-5 text-on-surface/90 lg:text-[11.5px]">
                    {line}
                  </code>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Card footer — full cards only */}
      {!rail && (
        <>
          <div className="mt-5 flex flex-wrap gap-1.5">
            {project.tech.slice(0, 5).map((tech) => (
              <span
                key={tech}
                className="rounded-full border border-outline-variant/70 bg-surface-container-high/50 px-2.5 py-0.5 text-[10px] text-on-surface-variant"
              >
                {tech}
              </span>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            {demo && (
              <a
                href={demo}
                target="_blank"
                rel="noreferrer"
                data-cursor="view"
                className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary/18"
              >
                Live demo
                <Zap size={14} />
              </a>
            )}
            <a
              href={`#project-${slug}`}
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onOpenCaseStudy?.(project); }}
              data-cursor="view"
              className="inline-flex items-center gap-1.5 rounded-lg border border-outline-variant bg-surface/60 px-4 py-2 text-sm font-semibold text-on-surface transition hover:border-primary/40 hover:text-primary"
            >
              Case study
              <FileText size={14} />
            </a>
            {!('sourceAccess' in project && project.sourceAccess === 'private') && (<a
              href={project.link}
              target="_blank"
              rel="noreferrer"
              data-cursor="view"
              className="inline-flex items-center gap-1.5 rounded-lg border border-outline-variant bg-surface/60 px-4 py-2 text-sm font-semibold text-on-surface transition hover:border-primary/40 hover:text-primary"
            >
              Source
              <ExternalLink size={14} />
            </a>)}
          </div>
        </>
      )}
    </div>
  );

  const card = (
    <TiltCard
      tabIndex={0}
      role="button"
      aria-label={`Open ${project.title} case study`}
      data-cursor="view"
      onClick={openFromCard}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') openFromCard(e); }}
      className={`project-card group grid h-full min-w-0 cursor-pointer overflow-hidden rounded-2xl border border-outline-variant transition-colors duration-200 hover:border-primary/35 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary relative ${rail ? 'min-h-0' : 'min-h-[20rem]'}`}
    >
      {cardContent}
    </TiltCard>
  );
  return rail ? <article className="h-full min-w-0">{card}</article> : <motion.article {...reveal} className="min-w-0">{card}</motion.article>;
});

const DemoPlaceholder = () => (
  <div className="flex min-h-[20rem] items-center justify-center gap-2 rounded-xl border border-outline-variant bg-surface/60 p-5 text-sm text-on-surface-variant" role="status">
    <Loader2 size={16} className="animate-spin" aria-hidden="true" /> Loading interactive demo…
  </div>
);

/** Load interactive engines only when their panel approaches the viewport. */
const DeferredDemo: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const panel = ref.current;
    if (!panel) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setReady(true);
        observer.disconnect();
      }
    }, { rootMargin: '240px' });
    observer.observe(panel);
    return () => observer.disconnect();
  }, []);

  return <div ref={ref} className="min-w-0 min-h-[20rem]">{ready ? <Suspense fallback={<DemoPlaceholder />}>{children}</Suspense> : <DemoPlaceholder />}</div>;
};

// ─── BentoGridView: High-Density Recruiter Matrix ────────────────────────────

const BentoGridView: React.FC<{
  projects: Project[];
  onOpenCaseStudy: (project: Project) => void;
}> = React.memo(({ projects, onOpenCaseStudy }) => {
  // Supported interactive demos:
  // - id: 1 -> Microservice Drift Tracker (AST Blast-Radius Simulator)
  // - id: 2 -> Cat-X (Operator Shift Twin Telemetry)
  // - id: 10 -> Traders ERP (Hardware ERP & VCTS Engine)
  // - id: 8 -> 3D Architecture Visualization System (Interactive 3D Viewport)
  const hasDemo = (id: number) => [1, 2, 10, 8].includes(id);

  // User-selected interactive demo project ID (or 'hidden' if user manually hid it)
  const [userSelectedDemoId, setUserSelectedDemoId] = useState<number | null | 'hidden'>(null);

  // Unconditionally derive the active demo ID directly during render without useEffect / cascading renders
  const activeDemoId = userSelectedDemoId === 'hidden'
    ? null
    : (userSelectedDemoId !== null && projects.some((p) => p.id === userSelectedDemoId))
      ? userSelectedDemoId
      : null;

  const setActiveDemoId = (id: number | null) => {
    setUserSelectedDemoId(id === null ? 'hidden' : id);
  };

  if (projects.length === 0) {
    return (
      <div className="surface-panel rounded-2xl p-10 text-center text-on-surface-variant">
        No projects match the selected filter.
      </div>
    );
  }

  const getDemoMeta = (id: number) => {
    switch (id) {
      case 1:
        return {
          title: 'AST Blast-Radius Simulator',
          badge: 'Interactive AI/ML Engine',
          accent: 'text-primary',
          border: 'border-primary/40',
          bg: 'bg-primary/10 hover:bg-primary/18',
        };
      case 2:
        return {
          title: 'In-Cab Telemetry Twin Simulator',
          badge: 'Live Operator Safety',
          accent: 'text-tertiary',
          border: 'border-tertiary/40',
          bg: 'bg-tertiary/10 hover:bg-tertiary/18',
        };
      case 10:
        return {
          title: 'Hardware ERP & VCTS Engine',
          badge: 'PostgreSQL Stored-Proc',
          accent: 'text-primary',
          border: 'border-primary/40',
          bg: 'bg-primary/10 hover:bg-primary/18',
        };
      case 8:
        return {
          title: '3D Architectural Model Viewport',
          badge: 'Real-time WebGL / Canvas 3D',
          accent: 'text-sky-400',
          border: 'border-sky-500/40',
          bg: 'bg-sky-500/10 hover:bg-sky-500/18',
        };
      default:
        return {
          title: 'Interactive Demo',
          badge: 'Live Preview',
          accent: 'text-primary',
          border: 'border-primary/40',
          bg: 'bg-primary/10 hover:bg-primary/18',
        };
    }
  };

  const renderDemo = (project: Project) => {
    switch (project.id) {
      case 1:
        return <DeferredDemo><BlastRadiusSimulator onExploreMore={() => onOpenCaseStudy(project)} /></DeferredDemo>;
      case 2:
        return <DeferredDemo><CatXTelemetryWidget /></DeferredDemo>;
      case 10:
        return <DeferredDemo><TradersErpSimulator onExploreMore={() => onOpenCaseStudy(project)} /></DeferredDemo>;
      case 8:
        return <DeferredDemo><ArchitectureViewer3D onExploreMore={() => onOpenCaseStudy(project)} /></DeferredDemo>;
      default:
        return null;
    }
  };

  const heroProject = projects[0];
  const companionProject = projects.length > 1 ? projects[1] : null;
  const secondaryProjects = projects.slice(2, 5);
  const remainingProjects = projects.slice(5);

  const handleCardClick = (project: Project, e: React.MouseEvent<HTMLElement>) => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim().length > 0) return;
    const target = e.target as HTMLElement;
    if (target.closest('a, button, input, textarea, select, canvas, [data-no-card-click]')) return;
    onOpenCaseStudy(project);
  };

  const handleCardKeyDown = (project: Project, e: React.KeyboardEvent<HTMLElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest('a, button, input, textarea, select, canvas, [data-no-card-click]')) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onOpenCaseStudy(project);
    }
  };

  return (
    <div className="bento-grid">
      {/* TILE 1: Top Ranked Project (Hero 12-cols in left lane) */}
      <motion.div
        {...reveal}
        className="col-span-12 flex flex-col"
      >
        <TiltCard
          role="button"
          tabIndex={0}
          aria-label={`Open ${heroProject.title} case study`}
          data-cursor="view"
          onClick={(e) => handleCardClick(heroProject, e)}
          onKeyDown={(e) => handleCardKeyDown(heroProject, e)}
          className="h-full surface-panel shimmer-card group rounded-2xl p-6 sm:p-7 border border-outline-variant hover:border-primary/40 transition-all duration-200 flex flex-col justify-between cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-primary/15 border border-primary/40 px-3 py-1 text-[11px] font-label font-bold uppercase tracking-[0.2em] text-primary">
                  <span className="inline-flex items-center gap-1.5"><Sparkles size={12} aria-hidden="true" /> 01 · Featured project</span>
                </span>
                <span className="rounded-full border border-tertiary/30 bg-tertiary/10 px-2.5 py-0.5 text-[10px] font-label uppercase tracking-[0.16em] text-tertiary">
                  {heroProject.category}
                </span>
              </div>
              <div className="flex min-w-0 flex-wrap items-center gap-2 text-xs leading-5 text-on-surface-variant font-mono">
                <span>{heroProject.tech.slice(0, 3).join(' · ')}</span>
              </div>
            </div>

            <h3 className="text-2xl sm:text-3xl font-display font-bold text-on-surface leading-tight group-hover:text-primary transition-colors">
              {heroProject.title}
            </h3>
            <p className="mt-1 text-xs font-label uppercase tracking-[0.20em] text-primary-dim">
              {heroProject.subtitle}
            </p>

            <p className="mt-3.5 text-sm sm:text-base leading-7 text-on-surface-variant">
              {heroProject.description}
            </p>

            <ProjectEvidence id={heroProject.id} />

            {/* Interactive Demo or Launch Banner */}
            {hasDemo(heroProject.id) ? (
              activeDemoId === heroProject.id ? (
                <div className="mt-5 space-y-2" data-no-view-cursor data-no-card-click onClick={(e) => e.stopPropagation()}>
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-outline-variant/40">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-primary font-bold flex items-center gap-1.5">
                      <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                      ACTIVE DEMO · {getDemoMeta(heroProject.id).title}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveDemoId(null);
                      }}
                      className="text-[11px] text-on-surface-variant hover:text-on-surface font-mono underline cursor-pointer"
                    >
                      Hide Demo
                    </button>
                  </div>
                  {renderDemo(heroProject)}
                </div>
              ) : (
                <div className="mt-5">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveDemoId(heroProject.id);
                    }}
                    className={`w-full flex items-center justify-between p-3.5 rounded-xl border ${getDemoMeta(heroProject.id).border} ${getDemoMeta(heroProject.id).bg} text-on-surface transition cursor-pointer group shadow-xs`}
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <Sparkles size={15} className={`${getDemoMeta(heroProject.id).accent} shrink-0`} />
                      <span className={`text-xs font-bold leading-5 font-mono ${getDemoMeta(heroProject.id).accent}`}>
                        {getDemoMeta(heroProject.id).title}
                      </span>
                      <span className="hidden sm:inline-block rounded-md border border-outline-variant bg-surface px-1.5 py-0.5 text-[9px] font-mono text-on-surface-variant">
                        {getDemoMeta(heroProject.id).badge}
                      </span>
                    </div>
                    <span className={`text-xs font-bold ${getDemoMeta(heroProject.id).accent} flex shrink-0 items-center gap-1`}>
                      <span className="hidden sm:inline">Launch demo</span><ArrowRight size={15} />
                    </span>
                  </button>
                </div>
              )
            ) : (
              <div className="mt-5 p-4 rounded-xl border border-outline-variant bg-surface/80 font-mono text-[11px] overflow-x-auto">
                <div className="text-[10px] uppercase tracking-wider text-primary font-bold mb-2 flex items-center gap-1.5">
                  <Cpu size={13} />
                  CORE STACK & PIPELINE
                </div>
                <div className="flex flex-wrap gap-2 text-on-surface">
                  {heroProject.tech.map((t) => (
                    <span key={t} className="px-2.5 py-1 rounded bg-surface-container-high border border-outline-variant text-xs">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 pt-5 border-t border-outline-variant flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap gap-1.5">
              {heroProject.tech.map((t) => (
                <span key={t} className="rounded-full border border-outline-variant bg-surface-container-high/60 px-2.5 py-0.5 text-[11px] text-on-surface-variant font-mono">
                  {t}
                </span>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {'sourceAccess' in heroProject && heroProject.sourceAccess === 'private' ? (
                <span className="text-xs font-semibold text-on-surface-variant">Private source</span>
              ) : (
                <a
                  href={heroProject.link}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-on-surface hover:text-primary transition"
                >
                  GitHub Source <ExternalLink size={13} />
                </a>
              )}
              {'demo' in heroProject && typeof heroProject.demo === 'string' && (
                <a
                  href={heroProject.demo}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-primary/30 bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition"
                >
                  <Zap size={13} /> Live Demo
                </a>
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenCaseStudy(heroProject);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold hover:bg-primary-dim transition cursor-pointer"
              >
                Interactive Case Study <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </TiltCard>
      </motion.div>

      {/* TILE 2: Companion Project (12-cols in left lane) */}
      {companionProject && (
        <motion.div
          {...reveal}
          className="col-span-12 flex flex-col"
        >
          <TiltCard
            role="button"
            tabIndex={0}
            aria-label={`Open ${companionProject.title} case study`}
            data-cursor="view"
            onClick={(e) => handleCardClick(companionProject, e)}
            onKeyDown={(e) => handleCardKeyDown(companionProject, e)}
            className="h-full surface-panel shimmer-card group rounded-2xl p-6 border border-outline-variant hover:border-tertiary/40 transition-all duration-200 flex flex-col justify-between cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tertiary"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="rounded-full bg-tertiary/15 border border-tertiary/40 px-2.5 py-0.5 text-[10px] font-label font-bold uppercase tracking-[0.18em] text-tertiary">
                  02 · {companionProject.category}
                </span>
                {'demo' in companionProject && (
                  <span className="text-[10px] text-primary-dim font-mono flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary-dim" />
                    Live demo
                  </span>
                )}
              </div>

              <h3 className="text-xl font-display font-bold text-on-surface leading-tight group-hover:text-tertiary transition-colors">
                {companionProject.title}
              </h3>
              <p className="mt-1 text-[11px] font-label uppercase tracking-[0.18em] text-tertiary">
                {companionProject.subtitle}
              </p>

              <p className="mt-3 text-xs sm:text-sm leading-6 text-on-surface-variant">
                {companionProject.description}
              </p>

              <ProjectEvidence id={companionProject.id} />

              {/* Companion Interactive Demo or Launch Banner */}
              {hasDemo(companionProject.id) && (
                activeDemoId === companionProject.id ? (
                  <div className="mt-5 space-y-2" data-no-view-cursor data-no-card-click onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-between pb-1 border-b border-outline-variant/40">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-tertiary font-bold flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        ACTIVE DEMO · {getDemoMeta(companionProject.id).title}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveDemoId(null);
                        }}
                        className="text-[11px] text-on-surface-variant hover:text-on-surface font-mono underline cursor-pointer"
                      >
                        Hide Demo
                      </button>
                    </div>
                    {renderDemo(companionProject)}
                  </div>
                ) : (
                  <div className="mt-4">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveDemoId(companionProject.id);
                      }}
                      className={`w-full flex items-center justify-between p-3 rounded-xl border ${getDemoMeta(companionProject.id).border} ${getDemoMeta(companionProject.id).bg} text-on-surface transition cursor-pointer group shadow-xs`}
                    >
                      <div className="flex items-center gap-2">
                        <Sparkles size={14} className={`${getDemoMeta(companionProject.id).accent}`} />
                        <span className={`text-xs font-bold font-mono ${getDemoMeta(companionProject.id).accent} uppercase tracking-wider`}>
                          {getDemoMeta(companionProject.id).title}
                        </span>
                        <span className="hidden sm:inline-block rounded-md border border-outline-variant bg-surface px-1.5 py-0.5 text-[9px] font-mono text-on-surface-variant">
                          {getDemoMeta(companionProject.id).badge}
                        </span>
                      </div>
                      <span className={`text-xs font-bold ${getDemoMeta(companionProject.id).accent} flex items-center gap-1 group-hover:translate-x-1 transition-transform`}>
                        Launch Demo <ArrowRight size={13} />
                      </span>
                    </button>
                  </div>
                )
              )}
            </div>

            <div className="mt-5 pt-4 border-t border-outline-variant flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex flex-wrap gap-1.5">
                {companionProject.tech.map((t) => (
                  <span key={t} className="rounded-full border border-outline-variant bg-surface-container-high/60 px-2 py-0.5 text-[10px] text-on-surface-variant font-mono">
                    {t}
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-2.5 sm:ml-auto">
                {companionProject.link && (!('sourceAccess' in companionProject) || companionProject.sourceAccess !== 'private') ? (
                  <a
                    href={companionProject.link}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-on-surface hover:text-tertiary transition"
                  >
                    GitHub <ExternalLink size={12} />
                  </a>
                ) : 'sourceAccess' in companionProject && companionProject.sourceAccess === 'private' ? (
                  <span className="text-xs font-semibold text-on-surface-variant">Private source</span>
                ) : null}
                {'demo' in companionProject && typeof companionProject.demo === 'string' && (
                  <a
                    href={companionProject.demo}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-tertiary/10 text-tertiary border border-tertiary/30 text-xs font-semibold hover:bg-tertiary/20 transition"
                  >
                    <Zap size={13} />
                    Live Demo
                  </a>
                )}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenCaseStudy(companionProject);
                  }}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-on-surface hover:text-tertiary transition cursor-pointer"
                >
                  Explore <ArrowRight size={13} />
                </button>
              </div>
            </div>
          </TiltCard>
        </motion.div>
      )}

      {/* SECONDARY ROW (2-column matrix in left lane) */}
      {secondaryProjects.map((p, idx) => {
        const isDemoAvailable = hasDemo(p.id);
        const isDemoActive = activeDemoId === p.id;

        return (
          <motion.div
            key={p.id}
            {...revealFast}
            className={`col-span-12 ${isDemoActive ? 'col-span-12' : 'sm:col-span-6'} flex flex-col transition-all duration-300`}
          >
            <TiltCard
              role="button"
              tabIndex={0}
              aria-label={`Open ${p.title} case study`}
              data-cursor="view"
              onClick={(e) => handleCardClick(p, e)}
              onKeyDown={(e) => handleCardKeyDown(p, e)}
              className="h-full surface-panel shimmer-card group rounded-2xl p-5 border border-outline-variant hover:border-primary/30 transition flex flex-col justify-between cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-label uppercase tracking-widest text-primary-dim">
                    0{idx + 3} · {p.category}
                  </span>
                  <span className="text-[10px] font-mono text-on-surface-variant/70">
                    {p.tech.slice(0, 2).join(' · ')}
                  </span>
                </div>
                <h3 className="text-lg font-display font-bold leading-6 text-on-surface group-hover:text-primary transition-colors">
                  {p.title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-on-surface-variant">
                  {p.description}
                </p>

                <ProjectEvidence id={p.id} />

                {/* Secondary card interactive demo toggle */}
                {isDemoAvailable && (
                  isDemoActive ? (
                    <div className="mt-4 space-y-2" data-no-view-cursor data-no-card-click onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-between pb-1 border-b border-outline-variant/40">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-primary font-bold flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          ACTIVE DEMO
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveDemoId(null);
                          }}
                          className="text-[10px] text-on-surface-variant hover:text-on-surface font-mono underline cursor-pointer"
                        >
                          Hide Demo
                        </button>
                      </div>
                      {renderDemo(p)}
                    </div>
                  ) : (
                    <div className="mt-3">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveDemoId(p.id);
                        }}
                        className={`w-full flex items-center justify-between p-2.5 rounded-xl border ${getDemoMeta(p.id).border} ${getDemoMeta(p.id).bg} text-on-surface transition cursor-pointer group`}
                      >
                        <div className="flex items-center gap-1.5">
                          <Sparkles size={13} className={`${getDemoMeta(p.id).accent}`} />
                          <span className={`text-[11px] font-bold font-mono ${getDemoMeta(p.id).accent} truncate max-w-[170px]`}>
                            {getDemoMeta(p.id).title}
                          </span>
                        </div>
                        <span className={`text-[11px] font-bold ${getDemoMeta(p.id).accent} flex items-center gap-0.5 group-hover:translate-x-1 transition-transform`}>
                          Launch <ArrowRight size={11} />
                        </span>
                      </button>
                    </div>
                  )
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-outline-variant flex items-center justify-between text-xs">
                {'demo' in p && typeof p.demo === 'string' ? (
                  <a
                    href={p.demo}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-primary hover:underline flex items-center gap-1 font-semibold"
                  >
                    <Zap size={12} /> Live Demo
                  </a>
                ) : 'sourceAccess' in p && p.sourceAccess === 'private' ? (
                  <span className="text-on-surface-variant flex items-center gap-1 font-semibold">Private source</span>
                ) : (
                  <a
                    href={p.link}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-on-surface-variant hover:text-primary flex items-center gap-1 font-semibold"
                  >
                    <Code2 size={12} /> Source
                  </a>
                )}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenCaseStudy(p);
                  }}
                  className="text-on-surface-variant hover:text-primary flex items-center gap-1 font-semibold ml-auto transition cursor-pointer"
                >
                  Case Study <ArrowRight size={12} />
                </button>
              </div>
            </TiltCard>
          </motion.div>
        );
      })}

      {/* TERTIARY ROW (2-column matrix in left lane) */}
      {remainingProjects.map((p, idx) => {
        const isDemoAvailable = hasDemo(p.id);
        const isDemoActive = activeDemoId === p.id;

        return (
          <motion.div
            key={p.id}
            {...revealFast}
            className={`col-span-12 ${isDemoActive ? 'col-span-12' : 'sm:col-span-6'} flex flex-col transition-all duration-300`}
          >
            <TiltCard
              role="button"
              tabIndex={0}
              aria-label={`Open ${p.title} case study`}
              data-cursor="view"
              onClick={(e) => handleCardClick(p, e)}
              onKeyDown={(e) => handleCardKeyDown(p, e)}
              className="h-full min-w-0 surface-panel-subtle group rounded-2xl p-5 border border-outline-variant hover:border-primary/30 transition-colors flex flex-col justify-between cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[9px] font-label uppercase tracking-wider text-primary-dim">{String(idx + 6).padStart(2, '0')} · {p.category}</span>
                </div>
                <h3 className="mt-2 text-lg font-display font-bold leading-6 text-on-surface group-hover:text-primary transition-colors">
                  {p.title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-on-surface-variant">
                  {p.description}
                </p>

                {/* Remaining card interactive demo toggle */}
                {isDemoAvailable && (
                  isDemoActive ? (
                    <div className="mt-3 space-y-2" data-no-view-cursor data-no-card-click onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-between pb-1 border-b border-outline-variant/40">
                        <span className="text-[9px] font-mono uppercase tracking-wider text-primary font-bold flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          ACTIVE DEMO
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveDemoId(null);
                          }}
                          className="text-[9px] text-on-surface-variant hover:text-on-surface font-mono underline cursor-pointer"
                        >
                          Hide Demo
                        </button>
                      </div>
                      {renderDemo(p)}
                    </div>
                  ) : (
                    <div className="mt-2.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveDemoId(p.id);
                        }}
                        className={`w-full flex items-center justify-between p-2 rounded-lg border ${getDemoMeta(p.id).border} ${getDemoMeta(p.id).bg} text-on-surface transition cursor-pointer group`}
                      >
                        <div className="flex items-center gap-1.5">
                          <Sparkles size={11} className={`${getDemoMeta(p.id).accent}`} />
                          <span className={`text-[10px] font-bold font-mono ${getDemoMeta(p.id).accent} truncate max-w-[150px]`}>
                            {getDemoMeta(p.id).title}
                          </span>
                        </div>
                        <span className={`text-[10px] font-bold ${getDemoMeta(p.id).accent} flex items-center gap-0.5 group-hover:translate-x-1 transition-transform`}>
                          Launch <ArrowRight size={10} />
                        </span>
                      </button>
                    </div>
                  )
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-outline-variant/60 flex flex-wrap items-center justify-between gap-3 text-xs">
                <span className="text-on-surface-variant font-mono text-[11px]">
                  {p.tech.slice(0, 2).join(' · ')}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenCaseStudy(p);
                  }}
                  className="text-primary font-semibold hover:text-primary-dim flex items-center gap-1 transition cursor-pointer"
                >
                  Details <ArrowRight size={10} />
                </button>
              </div>
            </TiltCard>
          </motion.div>
        );
      })}
    </div>
  );
});

// ─── SkillCard ────────────────────────────────────────────────────────────────

const SkillCard: React.FC<{ group: SkillGroup; index: number; onSelect: (id: number) => void }> = React.memo(({ group, index, onSelect }) => {
  const Icon = skillIcons[index % skillIcons.length];
  return (
    <motion.div
      {...reveal}
      className="surface-panel-subtle shimmer-card rounded-2xl p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/20"
    >
      <div className="mb-4 flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/8 text-primary">
          <Icon size={19} />
        </div>
        <div>
          <h3 className="text-base font-display font-bold text-on-surface">{group.category}</h3>
          <p className="mt-1 text-[13px] leading-5 text-on-surface-variant">
            {capabilitySummaries[group.category] ?? 'Tools and habits used repeatedly across the work.'}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {group.items.map((item) => (
          <span key={item} className="skill-pill">{item}</span>
        ))}
      </div>
      <button type="button" onClick={() => onSelect([1, 2, 10, 3, 1][index] ?? 1)} className="mt-5 inline-flex items-center gap-2 border-t border-outline-variant pt-4 text-xs font-semibold text-primary hover:text-on-surface">
        See it in {['MDT', 'Cat-X', 'Traders ERP', 'the video pipeline', 'MDT'][index] ?? 'selected work'} <ArrowRight size={13} />
      </button>
    </motion.div>
  );
});

// ─── ContactActions ───────────────────────────────────────────────────────────

const ContactActions: React.FC<{ email: string }> = ({ email }) => {
  const [copied, setCopied] = useState(false);
  const [isEmailChooserOpen, setIsEmailChooserOpen] = useState(false);
  const [sendState, setSendState] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [draft, setDraft] = useState({ name: '', replyTo: '', subject: '', message: '' });
  const sendControllerRef = useRef<AbortController | null>(null);
  const copiedTimerRef = useRef<number | undefined>(undefined);

  useEffect(() => () => {
    window.clearTimeout(copiedTimerRef.current);
    sendControllerRef.current?.abort();
  }, []);

  // Web3Forms access key from environment or portfolioData
  const accessKey =
    (import.meta.env.VITE_WEB3FORMS_ACCESS_KEY as string | undefined)?.trim() ||
    ((portfolioData.personal as { web3formsKey?: string }).web3formsKey || '').trim();

  const updateDraft = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.currentTarget;
    if (name !== 'name' && name !== 'replyTo' && name !== 'subject' && name !== 'message') return;
    setDraft((current) => ({ ...current, [name]: value }));
  };

  const getMailtoUrl = () => {
    const body = [
      'Hi Ayush,',
      '',
      draft.message.trim(),
      '',
      `Name: ${draft.name.trim()}`,
      `Reply to: ${draft.replyTo.trim()}`,
    ].join('\n');
    const subject = draft.subject.trim() || 'Portfolio enquiry';
    return `mailto:${encodeURI(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const getGmailUrl = () => {
    const body = [
      'Hi Ayush,',
      '',
      draft.message.trim(),
      '',
      `Name: ${draft.name.trim()}`,
      `Reply to: ${draft.replyTo.trim()}`,
    ].join('\n');
    const params = new URLSearchParams({
      view: 'cm',
      fs: '1',
      to: email,
      su: draft.subject.trim() || 'Portfolio enquiry',
      body,
    });
    return `https://mail.google.com/mail/?${params.toString()}`;
  };

  const getOutlookUrl = () => {
    const body = [
      'Hi Ayush,',
      '',
      draft.message.trim(),
      '',
      `Name: ${draft.name.trim()}`,
      `Reply to: ${draft.replyTo.trim()}`,
    ].join('\n');
    const params = new URLSearchParams({
      to: email,
      subject: draft.subject.trim() || 'Portfolio enquiry',
      body,
    });
    return `https://outlook.office.com/mail/deeplink/compose?${params.toString()}`;
  };

  const writeClipboard = async (value: string) => {
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(value);
        return;
      } catch {
        // Some browsers expose Clipboard API but deny access; try selection copy.
      }
    }

    const fallback = document.createElement('textarea');
    fallback.value = value;
    fallback.setAttribute('readonly', '');
    fallback.style.position = 'fixed';
    fallback.style.opacity = '0';
    document.body.appendChild(fallback);
    fallback.select();
    const copiedSuccessfully = document.execCommand('copy');
    fallback.remove();
    if (!copiedSuccessfully) throw new Error('Clipboard is unavailable');
  };

  const copyEmail = async () => {
    try {
      await writeClipboard(email);
      setCopied(true);
      setStatusMessage('Email address copied.');
      window.clearTimeout(copiedTimerRef.current);
      copiedTimerRef.current = window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setStatusMessage('Copy is unavailable here. Select the email address above to copy it.');
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (sendControllerRef.current) return;

    if (!draft.name.trim() || !draft.replyTo.trim() || !draft.message.trim()) {
      setStatusMessage('Please fill out all required fields.');
      return;
    }

    // Direct in-page transmission if an access key is configured
    if (accessKey) {
      const controller = new AbortController();
      sendControllerRef.current = controller;
      const timeout = window.setTimeout(() => controller.abort(), 15000);
      setSendState('sending');
      setStatusMessage('Transmitting message directly to Ayush...');

      try {
        const formattedSubject = `[Portfolio] ${draft.subject.trim() || 'New enquiry'} (${draft.name.trim()})`;
        const payload = {
          access_key: accessKey,
          name: draft.name.trim(),
          email: draft.replyTo.trim(),
          subject: formattedSubject,
          message: draft.message.trim(),
          from_name: `${draft.name.trim()} via Portfolio`,
          replyto: draft.replyTo.trim(),
        };

        const response = await fetch('https://api.web3forms.com/submit', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          signal: controller.signal,
          body: JSON.stringify(payload),
        });

        const result = await response.json().catch(() => null);

        if (response.ok && result?.success) {
          setSendState('success');
          setStatusMessage(`Message accepted by the email service for ${email}. Ayush can reply directly to ${draft.replyTo}.`);
          setDraft({ name: '', replyTo: '', subject: '', message: '' });
          setIsEmailChooserOpen(false);
        } else {
          setSendState('error');
          setStatusMessage('The email service could not accept your message. Your draft is safe: choose an email app below or copy it.');
          setIsEmailChooserOpen(true);
        }
      } catch {
        setSendState('error');
        setStatusMessage('We could not confirm sending. Your draft is saved here. Check your connection, or use an email app below.');
        setIsEmailChooserOpen(true);
      } finally {
        window.clearTimeout(timeout);
        sendControllerRef.current = null;
      }
      return;
    }

    // A configured provider sends in-page; otherwise preserve the draft in the visitor's email app.
    setSendState('idle');
    setStatusMessage('Your draft is ready. Choose an email app below to send it.');
    setIsEmailChooserOpen(true);
  };

  return (
    <div className="space-y-4">
      {sendState === 'success' ? (
        <div className="rounded-2xl border border-primary/30 bg-primary/10 p-6 text-center space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/20 text-primary">
            <Check size={24} />
          </div>
          <h4 className="text-base font-bold text-on-surface">Message submitted</h4>
          <p className="text-xs leading-5 text-on-surface-variant max-w-md mx-auto">
            The email service accepted your message for Ayush ({email}). Your email address is included so he can reply.
          </p>
          <button
            type="button"
            onClick={() => {
              setSendState('idle');
              setStatusMessage('');
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-on-primary transition hover:bg-primary-dim"
          >
            Send another message
          </button>
        </div>
      ) : (
        <form aria-label="Prepare an email message" onSubmit={handleSubmit} className="space-y-3 rounded-2xl border border-outline-variant bg-surface/65 p-4 sm:p-5">
          <p className="text-[10px] font-label font-bold uppercase tracking-[0.20em] text-primary-dim">Quick message</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1.5 text-xs font-semibold text-on-surface-variant">
              Your name
              <input
                name="name"
                autoComplete="name"
                required
                minLength={2}
                maxLength={100}
                value={draft.name}
                onChange={updateDraft}
                className="min-w-0 rounded-xl border border-outline-variant bg-surface-container-high px-3 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant/60"
                placeholder="Name"
              />
            </label>
            <label className="grid gap-1.5 text-xs font-semibold text-on-surface-variant">
              Your email
              <input
                name="replyTo"
                autoComplete="email"
                type="email"
                required
                maxLength={254}
                value={draft.replyTo}
                onChange={updateDraft}
                className="min-w-0 rounded-xl border border-outline-variant bg-surface-container-high px-3 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant/60"
                placeholder="you@example.com"
              />
            </label>
          </div>
          <label className="grid gap-1.5 text-xs font-semibold text-on-surface-variant">
            Subject
            <input
              name="subject"
              required
              maxLength={140}
              value={draft.subject}
              onChange={updateDraft}
              className="min-w-0 rounded-xl border border-outline-variant bg-surface-container-high px-3 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant/60"
              placeholder="What would you like to discuss?"
            />
          </label>
          <label className="grid gap-1.5 text-xs font-semibold text-on-surface-variant">
            Message
            <textarea
              name="message"
              required
              minLength={10}
              maxLength={3000}
              rows={4}
              value={draft.message}
              onChange={updateDraft}
              className="min-w-0 resize-y rounded-xl border border-outline-variant bg-surface-container-high px-3 py-2.5 text-sm leading-6 text-on-surface placeholder:text-on-surface-variant/60"
              placeholder="Share a little context so I can get back to you."
            />
          </label>
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="submit"
              disabled={sendState === 'sending'}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-on-primary transition hover:bg-primary-dim disabled:opacity-60 focus-visible:outline-offset-2"
            >
              {sendState === 'sending' ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Transmitting...
                </>
              ) : (
                <>
                  <Send size={16} /> {accessKey ? 'Send message' : 'Continue in email'}
                </>
              )}
            </button>
            <button
              type="button"
              onClick={async () => {
                try {
                  await writeClipboard(`To: ${email}\nSubject: ${draft.subject || 'Portfolio enquiry'}\n\n${draft.message}\n\nName: ${draft.name}\nReply to: ${draft.replyTo}`);
                  setStatusMessage('Message draft copied.');
                } catch {
                  setStatusMessage('Copy is unavailable in this browser.');
                }
              }}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-outline-variant bg-surface-container-high px-4 py-2.5 text-sm font-semibold text-on-surface transition hover:border-primary/40 hover:text-primary"
            >
              <Copy size={16} /> Copy draft
            </button>
          </div>

          {isEmailChooserOpen && (
            <div className="rounded-xl border border-primary/25 bg-primary/5 p-3.5 space-y-2.5" role="group" aria-label="Choose email app">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-on-surface">Send your draft using:</p>
                <button
                  type="button"
                  onClick={() => setIsEmailChooserOpen(false)}
                  className="rounded p-1 text-on-surface-variant hover:text-on-surface"
                  aria-label="Close email app options"
                >
                  <X size={14} />
                </button>
              </div>
              <p className="text-[11px] leading-4 text-on-surface-variant">
                Note: Choose your account in Gmail or Outlook, review the draft, then press Send. Your reply address stays in the message.
              </p>
              <div className="grid gap-2 sm:grid-cols-3">
                <a
                  href={getGmailUrl()}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => setStatusMessage('Gmail opened in a new tab with your draft.')}
                  className="inline-flex min-h-10 items-center justify-center rounded-lg border border-outline-variant bg-surface-container-high px-3 py-2 text-xs font-semibold text-on-surface transition hover:border-primary/40 hover:text-primary"
                >
                  Gmail
                </a>
                <a
                  href={getOutlookUrl()}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => setStatusMessage('Outlook opened in a new tab with your draft.')}
                  className="inline-flex min-h-10 items-center justify-center rounded-lg border border-outline-variant bg-surface-container-high px-3 py-2 text-xs font-semibold text-on-surface transition hover:border-primary/40 hover:text-primary"
                >
                  Outlook on the web
                </a>
                <a
                  href={getMailtoUrl()}
                  onClick={() => setStatusMessage('Your device will use its default email client.')}
                  className="inline-flex min-h-10 items-center justify-center rounded-lg border border-outline-variant bg-surface-container-high px-3 py-2 text-xs font-semibold text-on-surface transition hover:border-primary/40 hover:text-primary"
                >
                  Default email app
                </a>
              </div>
            </div>
          )}

          {statusMessage && (
            <div
              role="status"
              aria-live="polite"
              className={`flex items-start gap-2 rounded-xl p-3 text-xs leading-5 ${
                sendState === 'error'
                  ? 'border border-amber-500/30 bg-amber-500/10 text-amber-200'
                  : 'border border-primary/25 bg-primary/5 text-on-surface-variant'
              }`}
            >
              {sendState === 'error' && <AlertCircle size={15} className="mt-0.5 shrink-0 text-amber-400" />}
              <span>{statusMessage}</span>
            </div>
          )}
        </form>
      )}

      <button
        type="button"
        onClick={copyEmail}
        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-outline-variant bg-surface-container-high/70 px-4 py-2 text-sm font-semibold text-on-surface transition hover:border-primary/40 hover:text-primary"
      >
        {copied ? <Check size={16} className="text-primary-dim" /> : <Copy size={16} />}
        {copied ? 'Copied!' : 'Copy email address'}
      </button>
    </div>
  );
};


// ─── ProjectCaseStudy ─────────────────────────────────────────────────────────

const ProjectCaseStudy: React.FC<{ project: Project; onClose: () => void; reduceMotion: boolean }> = React.memo(({ project, onClose, reduceMotion }) => {
  const dialogRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const lines = useMemo(() => project.codePreview ? getCodePreviewLines(project.codePreview, 8) : [], [project.codePreview]);
  const notes = useMemo(() => getProjectScopeNotes(project), [project]);
  const demo = useMemo(() => getProjectDemo(project), [project]);
  const story = 'story' in project ? project.story : null;

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const appRoot = document.getElementById('root');
    const previousInert = appRoot?.inert ?? false;
    const previousOverflow = document.body.style.overflow;
    const previousPadding = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) document.body.style.paddingRight = `${scrollbarWidth}px`;
    if (appRoot) appRoot.inert = true;
    closeButtonRef.current?.focus({ preventScroll: true });

    const containFocus = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;
      const elements = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex="0"]') ?? [])
        .filter((element) => element.getClientRects().length > 0);
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (!first || !last) { event.preventDefault(); return; }
      if (event.shiftKey && (document.activeElement === first || !dialogRef.current?.contains(document.activeElement))) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !dialogRef.current?.contains(document.activeElement))) {
        event.preventDefault(); first.focus();
      }
    };
    document.addEventListener('keydown', containFocus);
    return () => {
      document.removeEventListener('keydown', containFocus);
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPadding;
      if (appRoot) appRoot.inert = previousInert;
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, [onClose]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <motion.div
      className="case-study-backdrop fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-background/85 backdrop-blur-md"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      role="dialog"
      aria-modal="true"
      aria-label={`${project.title} case study`}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.article
        ref={dialogRef}
        tabIndex={-1}
        className="case-study-dialog bg-surface/98 backdrop-blur-2xl border border-outline-variant max-h-[min(90dvh,820px)] w-full max-w-5xl overflow-y-auto rounded-2xl shadow-2xl"
        initial={reduceMotion ? false : { opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 10 }}
        transition={{ duration: reduceMotion ? 0 : 0.18, ease: 'easeOut' }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-outline-variant p-5 sm:p-7">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-label uppercase tracking-[0.18em] ${CATEGORY_COLORS[getProjectCategory(project)] ?? 'text-on-surface-variant border-outline-variant'}`}>
                {getProjectCategory(project)}
              </span>
              <span className="text-[10px] font-label uppercase tracking-[0.22em] text-primary-dim">
                Case study
              </span>
            </div>
            <h2 className="text-2xl font-display font-bold leading-tight text-on-surface sm:text-3xl">
              {project.title}
            </h2>
            <p className="mt-2 text-sm font-label uppercase tracking-[0.16em] text-on-surface-variant">
              {project.subtitle}
            </p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClose(); }}
            aria-label="Close case study"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-outline-variant bg-surface-container-high/70 text-on-surface-variant transition hover:border-primary/40 hover:text-primary"
          >
            <X size={17} />
          </button>
        </div>

        {story && (
          <section aria-label="Project story" className="border-b border-outline-variant bg-gradient-to-br from-primary/8 via-surface/60 to-tertiary/8 px-5 py-6 sm:px-7 sm:py-8">
            <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
              <div>
                <p className="mb-2 text-[9px] font-label font-bold uppercase tracking-[0.22em] text-primary-dim">The problem</p>
                <p className="text-base font-semibold leading-7 text-on-surface sm:text-lg">{story.challenge}</p>
                <p className="mt-3 text-sm leading-6 text-on-surface-variant">{story.approach}</p>
              </div>
              <div>
                <p className="mb-3 text-[9px] font-label font-bold uppercase tracking-[0.22em] text-on-surface-variant">How the system responds</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {story.flow.map((step, index) => (
                    <motion.div
                      key={step}
                      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: reduceMotion ? 0 : 0.32, delay: reduceMotion ? 0 : index * 0.07 }}
                      className={`relative min-h-16 rounded-xl border p-3 ${index === story.flow.length - 1 ? 'border-primary/35 bg-primary/10' : 'border-outline-variant bg-surface/60'}`}
                    >
                      <span className="block text-[8px] font-mono tracking-widest text-primary-dim">0{index + 1}</span>
                      <span className="mt-1 block text-[10px] font-semibold leading-4 text-on-surface sm:text-xs">{step}</span>
                      {index < story.flow.length - 1 && <ArrowRight size={12} className="absolute -right-2.5 top-1/2 z-10 hidden -translate-y-1/2 text-tertiary sm:block" />}
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Body */}
        <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="space-y-5">
            <p className="text-base leading-8 text-on-surface-variant">{project.description}</p>
            <ProjectEvidence id={project.id} />

            <div className="grid gap-3 sm:grid-cols-3">
              {notes.map((note) => (
                <div key={note.label} className="rounded-xl border border-outline-variant bg-surface/50 p-4">
                  <p className="text-[9px] font-label uppercase tracking-[0.22em] text-on-surface-variant/70">{note.label}</p>
                  <p className="mt-2 text-sm font-semibold text-on-surface">{note.value}</p>
                </div>
              ))}
            </div>

            <div>
              <p className="mb-3 text-[10px] font-label uppercase tracking-[0.2em] text-on-surface-variant">Tools used</p>
              <div className="flex flex-wrap gap-2">
                {project.tech.map((tech) => (
                  <span key={tech} className="skill-pill">{tech}</span>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-outline-variant bg-surface/60">
            <div className="flex items-center justify-between gap-4 border-b border-outline-variant px-4 py-3">
              <p className="text-[10px] font-label uppercase tracking-[0.18em] text-primary-dim">
                {getImplementationFocus(project)}
              </p>
              <span className="rounded-full border border-outline-variant/60 px-2.5 py-0.5 text-[9px] font-label uppercase tracking-[0.14em] text-on-surface-variant/60">
                {getCodePreviewLineCount(project.codePreview)}L
              </span>
            </div>
            <div className="px-4 py-3 font-mono">
              {lines.map((line, i) => (
                <div
                  key={`${project.id}-detail-${i}`}
                  className={`grid grid-cols-[1.75rem_minmax(0,1fr)] gap-3 py-1.5 ${i > 0 ? 'border-t border-outline-variant/40' : ''}`}
                >
                  <span className="text-[9px] font-label tabular-nums text-on-surface-variant/50">{i + 1}</span>
                  <code className="block overflow-hidden text-ellipsis whitespace-nowrap text-[11px] leading-5 text-on-surface/90">{line}</code>
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-3 border-t border-outline-variant p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm leading-6 text-on-surface-variant">
                {'sourceAccess' in project && project.sourceAccess === 'private'
                  ? 'Explore the live deployment; the source repository is private.'
                  : 'Open the live build or review source for implementation details.'}
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                {demo && (
                  <a href={demo} target="_blank" rel="noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary/18">
                    Live demo <Zap size={14} />
                  </a>
                )}
                {'sourceAccess' in project && project.sourceAccess === 'private' ? (
                  <span className="inline-flex items-center justify-center rounded-xl border border-outline-variant bg-surface-container-high/70 px-4 py-2 text-sm font-semibold text-on-surface-variant">
                    Private source
                  </span>
                ) : (
                  <a href={project.link} target="_blank" rel="noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-outline-variant bg-surface-container-high/70 px-4 py-2 text-sm font-semibold text-on-surface transition hover:border-primary/40 hover:text-primary">
                    View source <ExternalLink size={14} />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.article>
    </motion.div>,
    document.body
  );
});

// ─── Main SectionGroup ────────────────────────────────────────────────────────

export const SectionGroup: React.FC = () => {
  const { personal, projects, skills, socials } = portfolioData;
  const reduceMotion = useMotionPreference();
  const overlayRef = useRef<HTMLDivElement>(null);
  const resumeButtonRef = useRef<HTMLAnchorElement>(null);
  const horizontalRailRef = useRef<HTMLDivElement>(null);
  const railProgressBarRef = useRef<HTMLDivElement>(null);
  const railCounterRef = useRef<HTMLSpanElement>(null);
  const visibleProjectsCountRef = useRef(0);

  const projectViewMode = useStore((s) => s.projectViewMode);
  const setProjectViewMode = useStore((s) => s.setProjectViewMode);

  const [projectFilter, setProjectFilter] = useState('All');
  const [showResumeCue, setShowResumeCue] = useState(false);
  const [resumeCueGeometry, setResumeCueGeometry] = useState<ResumeCueGeometry | null>(null);
  const [activeProjectSlug, setActiveProjectSlug] = useState<string | null>(null);
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);
  const [hasOpenedTerminal, setHasOpenedTerminal] = useState(false);

  // Global shortcut (tilde/backtick) to toggle Developer CLI Terminal
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '`' || e.key === '~') {
        const activeElem = document.activeElement;
        if (activeElem && (['INPUT', 'TEXTAREA', 'SELECT'].includes(activeElem.tagName) || (activeElem as HTMLElement).isContentEditable)) return;
        if (document.querySelector('[aria-modal="true"]:not(.terminal-window)')) return;
        e.preventDefault();
        setHasOpenedTerminal(true);
        setIsTerminalOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const openCaseStudy = useCallback((project: Project) => {
    const slug = getProjectSlug(project);
    setActiveProjectSlug(slug);
    window.history.replaceState(null, '', `#project-${slug}`);
  }, []);

  const openCaseStudyFromTerminal = useCallback((slug: string) => {
    const project = projects.find((item) => getProjectSlug(item) === slug);
    if (!project) return;
    setIsTerminalOpen(false);
    openCaseStudy(project);
  }, [openCaseStudy, projects]);

  const closeCaseStudy = useCallback(() => {
    setActiveProjectSlug(null);
    if (window.location.hash.startsWith('#project-')) {
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
    }
  }, []);

  // Resume cue animation - localized directional indicator
  useEffect(() => {
    const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (motionPreference.matches || window.scrollY > 8 || window.location.hash || document.hidden) return;
    let dismissed = false;
    const measureCue = () => {
      const btn = resumeButtonRef.current;
      if (!btn) return;
      const rect = btn.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0 || rect.top < 100 || rect.bottom > window.innerHeight) return;
      const endX = rect.left + rect.width / 2;
      const endY = rect.top - 8;
      const startX = endX - 52;
      const startY = endY - 58;
      setResumeCueGeometry({
        startX,
        startY,
        endX,
        endY,
        controlOneX: startX + 10,
        controlOneY: startY + 28,
        controlTwoX: endX - 16,
        controlTwoY: endY - 20,
      });
    };
    const showTimer = window.setTimeout(() => {
      if (dismissed || document.hidden || window.scrollY > 8) return;
      const rect = resumeButtonRef.current?.getBoundingClientRect();
      if (!rect || rect.top < 100 || rect.bottom > window.innerHeight) return;
      measureCue();
      setShowResumeCue(true);
    }, 700);
    const hideTimer = window.setTimeout(() => setShowResumeCue(false), 3600);
    const dismiss = () => {
      dismissed = true;
      window.clearTimeout(showTimer);
      setShowResumeCue(false);
    };
    window.addEventListener('keydown', dismiss, { once: true });
    window.addEventListener('resize', dismiss, { passive: true });
    window.addEventListener('pointerdown', dismiss, { once: true });
    document.addEventListener('visibilitychange', dismiss);
    motionPreference.addEventListener('change', dismiss, { once: true });
    window.addEventListener('scroll', dismiss, { once: true, passive: true });
    return () => {
      window.clearTimeout(showTimer);
      window.clearTimeout(hideTimer);
      window.removeEventListener('keydown', dismiss);
      window.removeEventListener('resize', dismiss);
      window.removeEventListener('pointerdown', dismiss);
      document.removeEventListener('visibilitychange', dismiss);
      motionPreference.removeEventListener('change', dismiss);
      window.removeEventListener('scroll', dismiss);
    };
  }, []);

  const projectFilters = useMemo(
    () => ['All', ...Array.from(new Set(projects.map(getProjectCategory)))],
    [projects],
  );
  const visibleProjects = useMemo(
    () => projects.filter((p) => projectFilter === 'All' || getProjectCategory(p) === projectFilter),
    [projectFilter, projects],
  );

  const activeProject = useMemo(
    () => projects.find((p) => getProjectSlug(p) === activeProjectSlug) ?? null,
    [activeProjectSlug, projects],
  );

  // Hash-based case study routing
  useEffect(() => {
    const sync = () => {
      const slug = window.location.hash.replace('#project-', '');
      if (!slug || slug === window.location.hash) { setActiveProjectSlug(null); return; }
      setActiveProjectSlug(projects.some((p) => getProjectSlug(p) === slug) ? slug : null);
    };
    sync();
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, [projects]);

  useEffect(() => {
    visibleProjectsCountRef.current = visibleProjects.length;
    horizontalRailRef.current?.scrollTo({ left: 0, behavior: 'instant' });
    if (railCounterRef.current) railCounterRef.current.textContent = `1/${visibleProjects.length}`;
    if (railProgressBarRef.current) railProgressBarRef.current.style.width = '0%';
  }, [visibleProjects.length, projectFilter, projectViewMode]);

  // Interactive rail navigation
  const scrollRail = useCallback((direction: number) => {
    const rail = horizontalRailRef.current;
    if (!rail) return;
    const firstCard = rail.firstElementChild as HTMLElement | null;
    const cardWidth = firstCard ? firstCard.offsetWidth + parseFloat(getComputedStyle(rail).columnGap || '0') : rail.clientWidth * 0.8;
    rail.scrollBy({ left: direction * cardWidth, behavior: reduceMotion ? 'auto' : 'smooth' });
  }, [reduceMotion]);

  const handleRailScroll = useCallback(() => {
    const rail = horizontalRailRef.current;
    if (!rail) return;
    const max = Math.max(1, rail.scrollWidth - rail.clientWidth);
    const ratio = Math.min(1, Math.max(0, rail.scrollLeft / max));
    if (railProgressBarRef.current) {
      railProgressBarRef.current.style.width = `${Math.round(ratio * 100)}%`;
    }
    if (railCounterRef.current) {
      const total = visibleProjectsCountRef.current || 1;
      const current = Math.min(total, Math.max(1, Math.round(ratio * (total - 1)) + 1));
      railCounterRef.current.textContent = `${current}/${total}`;
    }
  }, []);

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div ref={overlayRef} id="scroll-container" className="ui-overlay">
      {/* Background grid */}
      <div
        className="fixed inset-0 z-0 pointer-events-none cyber-grid"
        style={{ contain: 'strict' }}
        aria-hidden="true"
      />

      <main id="main-content" tabIndex={-1} className="relative z-10">
        <AnimatePresence>
          {activeProject && (
            <ProjectCaseStudy key={`cs-${activeProject.id}`} project={activeProject} onClose={closeCaseStudy} reduceMotion={Boolean(reduceMotion)} />
          )}

          {/* Elegant Localized Resume Cue */}
          {!reduceMotion && showResumeCue && resumeCueGeometry && (
            <motion.div
              key="resume-cue"
              data-resume-cue
              className="pointer-events-none fixed inset-0 z-40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0 } }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
            >
              <svg className="absolute inset-0 h-full w-full" aria-hidden="true">
                <defs>
                  <linearGradient id="rcg" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="var(--tertiary)" stopOpacity="0.1" />
                    <stop offset="50%" stopColor="var(--tertiary)" stopOpacity="0.95" />
                    <stop offset="100%" stopColor="var(--primary)" stopOpacity="1" />
                  </linearGradient>
                  <marker
                    id="cue-arrow-head"
                    viewBox="0 0 10 10"
                    refX="5"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto-start-reverse"
                  >
                    <path d="M 1 2 L 8 5 L 1 8 z" fill="var(--primary)" />
                  </marker>
                  <filter id="rcglow" x="-30%" y="-30%" width="160%" height="160%">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                  </filter>
                </defs>
                <motion.path
                  d={getResumeCuePath(resumeCueGeometry)}
                  fill="none"
                  stroke="url(#rcg)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  markerEnd="url(#cue-arrow-head)"
                  filter="url(#rcglow)"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: [0, 1, 1] }}
                  transition={{ duration: 1.0, ease: [0.16, 1, 0.3, 1] }}
                />
              </svg>
              <motion.div
                className="absolute rounded-full border border-primary/35 bg-surface-container-high/90 backdrop-blur-md px-2.5 py-1 text-[10px] font-mono uppercase tracking-[0.16em] text-primary shadow-xl shadow-primary/10 flex items-center gap-1.5"
                style={{ left: resumeCueGeometry.startX - 6, top: resumeCueGeometry.startY - 14, transform: 'translate(-50%,-50%)' }}
                initial={{ opacity: 0, scale: 0.8, y: 6 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.15, ease: 'easeOut' }}
              >
                <Download size={11} className="text-primary" />
                <span>Resume PDF</span>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── HERO ─────────────────────────────────────────────────────── */}
        <SectionShell
          id="hero"
          className="hero-section flex min-h-[100svh] flex-col justify-center overflow-hidden px-5 pb-10 pt-24 sm:px-8 lg:px-12 xl:px-16"
        >
          <div className="mx-auto w-full min-w-0 max-w-screen-2xl">
            <div className="content-lane relative z-10 hero-intro">
                {/* Availability and role focus */}
              <div className="mb-6 flex flex-wrap items-center gap-2.5">
                <div className="inline-flex items-center gap-2.5 rounded-full border border-primary/30 bg-primary/8 px-4 py-2 text-[11px] font-label font-bold uppercase tracking-[0.20em] text-primary shadow-sm shadow-primary/10">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary" />
                  </span>
                  Available for software roles
                </div>



              </div>

              <p className="hero-role">Software developer</p>
              <h1 className="hero-name">{personal.name}<span className="text-primary">.</span></h1>
              <p className="hero-statement">Backend systems.<br /><span>Applied intelligence.</span></p>
              <p className="hero-description">{personal.bio}</p>
              <div className="hero-credentials">
                <span>VIT Vellore / Computer Science '27</span>
                <span>Software Developer Intern / KuppiSmart, 2025</span>
              </div>
            </div>

            {/* CTAs */}
            <div className="content-lane relative z-10 mt-7 flex flex-wrap gap-3 hero-actions">
              <button
                type="button"
                onClick={() => scrollToSection('projects')}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-sm font-bold text-on-primary transition hover:bg-primary-dim active:scale-[0.98]"
              >
                Explore selected work
                <ArrowRight size={17} />
              </button>
              <a
                ref={resumeButtonRef}
                href={`${import.meta.env.BASE_URL}resume.pdf`}
                download="Ayush-Bajaj-Resume.pdf"
                className={`relative inline-flex items-center justify-center gap-2 rounded-xl border px-6 py-3.5 text-sm font-semibold transition active:scale-[0.98] ${
                  showResumeCue
                    ? 'z-50 border-tertiary/40 bg-surface-container-high text-tertiary shadow-2xl shadow-tertiary/10 ring-1 ring-tertiary/25'
                    : 'border-outline-variant bg-surface-container-high/70 text-on-surface hover:border-tertiary/40 hover:text-tertiary'
                }`}
              >
                <Download size={17} />
                Resume
              </a>

              <button type="button" onClick={() => scrollToSection('contact')} className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-on-surface-variant hover:text-primary">Let’s talk <ArrowRight size={15} /></button>
            </div>
            <div className="content-lane relative z-10 mt-8">
              <SelectedWorkLinks onSelect={(id) => { const project = projects.find(item => item.id === id); if (project) openCaseStudy(project); }} />
            </div>

            {/* Interactive Scroll-Down Cue */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9, duration: 0.6 }}
              className="relative z-10 mt-5 hidden sm:flex items-center gap-3 text-[11px] font-label uppercase tracking-[0.22em] text-on-surface-variant/75"
            >
              <button
                type="button"
                onClick={() => scrollToSection('projects')}
                className="inline-flex items-center gap-2.5 transition hover:text-primary cursor-pointer group"
                aria-label="Scroll to Projects"
              >
                <div className="flex h-7 w-4.5 items-start justify-center rounded-full border border-outline-variant group-hover:border-primary/50 transition p-1">
                  <motion.div
                    animate={{ y: 0 }}
                    transition={{ duration: 0 }}
                    className="h-1.5 w-1 rounded-full bg-primary"
                  />
                </div>
                <span>Scroll to explore</span>
                <ChevronDown size={14} className="text-primary group-hover:translate-y-0.5 transition-transform" />
              </button>
            </motion.div>
          </div>
        </SectionShell>

        {/* ── PROJECTS ─────────────────────────────────────────────────── */}
        <SectionShell
          id="projects"
          className="px-5 py-16 sm:px-8 sm:py-20 lg:px-12 xl:px-16"
        >
          <div className="mx-auto w-full min-w-0 max-w-screen-2xl">
            <div className="content-lane mb-6 flex flex-col gap-5">
              <SectionHeading
                eyebrow={sectionCopy.projects.eyebrow}
                title={sectionCopy.projects.title}
                copy={sectionCopy.projects.copy}
              />
              <div className="flex flex-wrap items-center gap-3 pt-2">
                {/* View Mode Toggle: Recruiter Bento Grid (default) vs Cinematic 3D Flow */}
                <div role="group" aria-label="Project layout" className="flex items-center gap-1 p-1 rounded-xl border border-outline-variant bg-surface-container-high/65">
                  <button
                    type="button"
                    aria-pressed={projectViewMode === 'bento'}
                    onClick={() => setProjectViewMode('bento')}
                    className={`inline-flex min-h-11 items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
                      projectViewMode === 'bento'
                        ? 'bg-primary text-on-primary shadow-sm'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    <Grid size={13} />
                    <span>Bento Grid</span>
                  </button>
                  <button
                    type="button"
                    aria-pressed={projectViewMode === 'cinematic'}
                    onClick={() => setProjectViewMode('cinematic')}
                    className={`inline-flex min-h-11 items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
                      projectViewMode === 'cinematic'
                        ? 'bg-primary text-on-primary shadow-sm'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    <Sparkles size={13} />
                    <span>Cinematic</span>
                  </button>
                </div>

                {/* Arrow navigation buttons for smooth carousel gliding (Cinematic only) */}
                {projectViewMode === 'cinematic' && (
                  <div className="hidden lg:flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => scrollRail(-1)}
                      aria-label="Previous projects"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-outline-variant bg-surface-container-high/65 text-on-surface-variant transition hover:border-primary/40 hover:text-primary active:scale-95 cursor-pointer"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => scrollRail(1)}
                      aria-label="Next projects"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-outline-variant bg-surface-container-high/65 text-on-surface-variant transition hover:border-primary/40 hover:text-primary active:scale-95 cursor-pointer"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                )}

                <a
                  href="https://github.com/AyushBajaj7"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl border border-outline-variant bg-surface-container-high/65 px-4 py-2 text-xs font-semibold text-on-surface transition hover:border-primary/40 hover:text-primary"
                >
                  <Code2 size={15} />
                  GitHub
                </a>
              </div>
            </div>

            {/* Filter projects by their main discipline */}
            <div className="content-lane mb-7 flex flex-wrap items-center justify-between gap-4">
              <div role="group" aria-label="Filter projects by discipline" className="flex flex-wrap gap-2">
                {projectFilters.map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    aria-pressed={projectFilter === filter}
                    onClick={() => setProjectFilter(filter)}
                    className={`min-h-11 rounded-xl border px-3.5 py-2 text-sm font-semibold transition cursor-pointer ${
                      projectFilter === filter
                        ? 'border-primary bg-primary text-on-primary'
                        : 'border-outline-variant bg-surface-container-high/60 text-on-surface-variant hover:border-primary/40 hover:text-primary'
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>

              <p className="text-xs text-on-surface-variant" role="status" aria-live="polite">{visibleProjects.length} {visibleProjects.length === 1 ? 'project' : 'projects'}</p>

              {projectViewMode === 'cinematic' && (
                <div className="hidden lg:flex items-center gap-4 text-[11px] font-label uppercase tracking-[0.18em] text-on-surface-variant" aria-hidden="true">
                  <span ref={railCounterRef}>1/{visibleProjects.length}</span>
                  <div className="h-1.5 w-36 overflow-hidden rounded-full bg-surface-container-high">
                    <div
                      ref={railProgressBarRef}
                      className="h-full rounded-full bg-gradient-to-r from-primary to-tertiary transition-all duration-150"
                      style={{ width: `${Math.round((1 / Math.max(1, visibleProjects.length)) * 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* View Mode Switching: Recruiter Bento Grid vs Cinematic 3D Flow */}
            {projectViewMode === 'bento' ? (
              <div className="content-lane">
                <BentoGridView projects={visibleProjects} onOpenCaseStudy={openCaseStudy} />
              </div>
            ) : (
              <>
                {/* Desktop horizontal rail with smooth native momentum and 3D tilt */}
                <div className="hidden lg:block relative cinematic-stage">
                  <div
                    ref={horizontalRailRef}
                    onScroll={handleRailScroll}
                    tabIndex={0}
                    role="region"
                    aria-label="Cinematic projects. Use Left and Right arrow keys to browse."
                    onKeyDown={(event) => {
                      if (event.target !== event.currentTarget || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
                      event.preventDefault();
                      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') scrollRail(event.key === 'ArrowLeft' ? -1 : 1);
                      else event.currentTarget.scrollTo({ left: event.key === 'Home' ? 0 : event.currentTarget.scrollWidth, behavior: reduceMotion ? 'auto' : 'smooth' });
                    }}
                    id="project-rail"
                    className="project-rail-scroll flex w-full items-stretch gap-5 overflow-x-auto overflow-y-hidden py-3"
                  >
                    {/* Intro card */}
                    <div className="project-rail-item surface-panel flex min-h-[27rem] w-[21rem] flex-none flex-col justify-between rounded-2xl p-6 xl:w-[23rem]">
                      <div>
                        <div className="mb-3 flex items-center gap-2">
                          <Briefcase size={14} className="text-primary-dim" />
                          <p className="text-[10px] font-label uppercase tracking-[0.22em] text-primary-dim">Overview</p>
                        </div>
                        <h3 className="text-xl font-display font-bold leading-tight text-on-surface">
                          Real systems with technical context.
                        </h3>
                      </div>
                      <p className="text-sm leading-6 text-on-surface-variant">
                        {visibleProjects.length} projects with architectural context, interactive demos, and source details.
                      </p>
                      <div className="flex items-center gap-2 text-xs font-semibold text-primary">
                        <span>Swipe or click arrows</span>
                        <ArrowRight size={14} />
                      </div>
                    </div>

                    {visibleProjects.map((project, index) => (
                      <div key={project.id} className="project-rail-item flex min-h-[27rem] w-[21rem] flex-none flex-col xl:w-[23rem]">
                        <ProjectCard project={project} index={index} rail onOpenCaseStudy={openCaseStudy} />
                      </div>
                    ))}

                    {/* Continue to profile card */}
                    <button
                      type="button"
                      onClick={() => scrollToSection('about')}
                      className="project-rail-item surface-panel group flex min-h-[27rem] w-[21rem] flex-none flex-col justify-between rounded-2xl p-6 text-left transition-colors hover:border-primary/35 xl:w-[23rem] cursor-pointer"
                    >
                      <span className="text-[10px] font-label uppercase tracking-[0.22em] text-primary-dim">Next</span>
                      <span className="text-xl font-display font-bold leading-tight text-on-surface">Continue to profile.</span>
                      <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-primary text-on-primary transition group-hover:translate-x-1.5">
                        <ArrowRight size={20} />
                      </span>
                    </button>
                  </div>

                  {/* Interactive Timeline Filmstrip Scrubber */}
                  <div className="flex items-center gap-2 mt-4 px-1 py-2 overflow-x-auto hide-scrollbar border-t border-outline-variant/60 pt-4">
                    <span className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant/70 mr-1 flex items-center gap-1.5 shrink-0">
                      <SlidersHorizontal size={12} className="text-primary" />
                      Filmstrip Scrubber:
                    </span>
                    {visibleProjects.map((p, idx) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          const rail = horizontalRailRef.current;
                          if (!rail) return;
                          const card = rail.children[idx + 1] as HTMLElement | undefined;
                          if (card) rail.scrollTo({ left: card.offsetLeft - (rail.firstElementChild as HTMLElement).offsetLeft, behavior: reduceMotion ? 'auto' : 'smooth' });
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-outline-variant bg-surface-container-high/60 text-[11px] font-mono text-on-surface-variant hover:border-primary/40 hover:text-primary hover:bg-surface-container-highest transition cursor-pointer shrink-0"
                      >
                        <span className="text-primary font-bold">{String(idx + 1).padStart(2, '0')}</span>
                        <span className="truncate max-w-[120px]">{p.title.split(':')[0]}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Mobile/tablet grid */}
                <div className="grid gap-5 md:grid-cols-2 lg:hidden">
                  {visibleProjects.map((project, index) => (
                    <ProjectCard key={project.id} project={project} index={index} onOpenCaseStudy={openCaseStudy} />
                  ))}
                </div>
              </>
            )}
          </div>
        </SectionShell>

        {/* ── ABOUT ────────────────────────────────────────────────────── */}
        <SectionShell id="about" className="px-5 py-16 sm:px-8 sm:py-20 lg:px-12 xl:px-16 lg:py-24">
          <div className="content-lane flex flex-col gap-8">
            <SectionHeading
              eyebrow={sectionCopy.about.eyebrow}
              title={sectionCopy.about.title}
              copy={personal.about}
            />

            <motion.div {...reveal} className="grid gap-4">
              {/* Location + philosophy card */}
              <div className="surface-panel shimmer-card rounded-2xl p-6">
                <div className="mb-4 flex items-center gap-3">
                  <MapPin size={16} className="text-primary-dim shrink-0" />
                  <span className="text-sm font-semibold text-on-surface">{personal.location}</span>
                </div>
                <p className="text-sm leading-7 text-on-surface-variant">
                  I prefer work where the interface, logic, and delivery path hold together — not just look polished in isolation.
                </p>
              </div>

              <div className="experience-card surface-panel rounded-2xl p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div><p className="evidence-label">Professional experience</p><h3 className="mt-2 text-xl font-display font-bold">{personal.experience.role}</h3><p className="mt-1 text-sm text-primary">{personal.experience.company}</p></div>
                  <span className="text-xs font-mono text-on-surface-variant">{personal.experience.period}</span>
                </div>
                <ul className="mt-5 space-y-3 text-sm leading-6 text-on-surface-variant">{personal.experience.highlights.map(item => <li key={item} className="flex gap-3"><Check size={15} className="mt-1 shrink-0 text-primary" /><span>{item}</span></li>)}</ul>
              </div>
              <div className="surface-panel rounded-2xl p-6">
                <p className="evidence-label">Education</p>
                <h3 className="mt-2 text-xl font-display font-bold">{personal.education.institution}</h3>
                <p className="mt-2 text-sm text-on-surface-variant">{personal.education.degree} / {personal.education.period}</p>
                <p className="mt-3 text-sm text-primary">CGPA {personal.education.cgpa}</p>
              </div>

              {/* Principles */}
              <div className="surface-panel-subtle rounded-2xl p-5">
                <div className="mb-3 flex items-center gap-2">
                  <Calendar size={13} className="text-primary-dim" />
                  <p className="text-[10px] font-label uppercase tracking-[0.20em] text-primary-dim">Principles</p>
                </div>
                <div className="grid gap-3 text-sm leading-7 text-on-surface-variant">
                  {[
                    'Prefer implementation that can be explained clearly and maintained without ceremony.',
                    'Deep interest in financial systems, market data pipelines, and quantitative decision workflows.',
                    'Use interaction and animation to support the content, not compete with it.',
                    'Work across frontend, backend, and ML when the product needs all three.',
                  ].map((text) => (
                    <div key={text} className="flex items-start gap-3">
                      <Check size={14} className="mt-1 shrink-0 text-primary-dim" />
                      <span>{text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </SectionShell>

        {/* ── SKILLS ───────────────────────────────────────────────────── */}
        <SectionShell id="skills" className="px-5 py-16 sm:px-8 sm:py-20 lg:px-12 xl:px-16 lg:py-24">
          <div className="content-lane">
            <SectionHeading
              eyebrow={sectionCopy.skills.eyebrow}
              title={sectionCopy.skills.title}
              copy={sectionCopy.skills.copy}
            />
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {skills.map((group, index) => (
                <SkillCard key={group.category} group={group} index={index} onSelect={(id) => { const project = projects.find(item => item.id === id); if (project) openCaseStudy(project); }} />
              ))}
            </div>
          </div>
        </SectionShell>

        {/* ── CONTACT ──────────────────────────────────────────────────── */}
        <SectionShell id="contact" className="px-5 py-16 sm:px-8 sm:py-20 lg:px-12 xl:px-16 lg:py-24">
          <div className="content-lane grid gap-8">
            <div>
              <SectionHeading
                eyebrow={sectionCopy.contact.eyebrow}
                title={sectionCopy.contact.title}
                copy={sectionCopy.contact.copy}
              />
            </div>

            <motion.div {...reveal} className="surface-panel rounded-2xl p-5 sm:p-7">
              {/* Availability badge */}
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/6 px-3 py-1.5 text-[11px] font-label uppercase tracking-[0.18em] text-primary-dim">
                <span className="status-dot h-1.5 w-1.5 rounded-full bg-primary-dim" />
                Open to opportunities
              </div>

              <div className="mb-7">
                <p className="text-[10px] font-label uppercase tracking-[0.22em] text-on-surface-variant mb-2">Email</p>
                <a
                  href={`mailto:${personal.email}`}
                  className="break-all text-lg font-display font-bold leading-8 text-on-surface transition hover:text-primary sm:text-2xl"
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
                      className="inline-flex items-center gap-2 rounded-xl border border-outline-variant bg-surface/40 px-4 py-2.5 text-sm font-semibold text-on-surface-variant transition hover:border-primary/40 hover:text-primary"
                    >
                      <Icon size={16} />
                      {social.platform}
                    </a>
                  );
                })}
                <a href={personal.resumeLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-outline-variant px-4 py-2.5 text-sm font-semibold text-on-surface-variant hover:text-primary">Drive copy <ExternalLink size={15} /></a>
                <a
                  href={`${import.meta.env.BASE_URL}resume.pdf`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl border border-outline-variant bg-surface-container-high/60 px-4 py-2.5 text-sm font-semibold text-on-surface-variant transition hover:border-primary/40 hover:text-primary"
                >
                  <FileText size={16} /> Resume PDF
                </a>
              </div>
            </motion.div>
          </div>
        </SectionShell>
      </main>

      {/* Floating Developer CLI Terminal Trigger Button */}
      {!activeProject && (
        <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40">
          <button
            type="button"
            onClick={() => { setHasOpenedTerminal(true); setIsTerminalOpen(true); }}
            className="inline-flex items-center gap-2 rounded-full border border-tertiary/40 bg-surface/90 backdrop-blur-md p-2.5 sm:px-4 sm:py-2.5 text-xs font-mono font-semibold text-on-surface shadow-2xl hover:border-tertiary hover:text-tertiary hover:shadow-tertiary/20 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer"
            aria-label="Open Developer CLI Terminal"
            title="Open Developer CLI Terminal (~)"
          >
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="relative inline-flex rounded-full h-2 w-2 bg-tertiary" />
            </span>
            <Terminal size={15} className="text-tertiary shrink-0" />
            <span className="hidden sm:inline">CLI Terminal</span>
            <span className="hidden sm:inline text-[9px] text-tertiary/80 bg-tertiary/10 px-1.5 py-0.5 rounded border border-tertiary/20">
              ~
            </span>
          </button>
        </div>
      )}

      {/* Developer CLI Terminal Modal */}
      {hasOpenedTerminal && (
        <Suspense fallback={isTerminalOpen ? <div className="fixed bottom-20 right-5 z-50 rounded-xl border border-outline-variant bg-surface px-4 py-3 text-sm text-on-surface" role="status">Loading terminal…</div> : null}>
          <TerminalModal isOpen={isTerminalOpen} onClose={() => setIsTerminalOpen(false)} onOpenCaseStudy={openCaseStudyFromTerminal} />
        </Suspense>
      )}
    </div>
  );
};
