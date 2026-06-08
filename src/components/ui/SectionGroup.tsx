/**
 * @fileoverview SectionGroup component - Main content sections for the portfolio.
 * Handles hero, projects (with horizontal scroll on desktop), about, skills, and contact sections.
 * Implements scroll-driven animations, project filtering, and responsive layouts.
 * @author Ayush Bajaj
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useInView } from 'framer-motion';
import {
  ArrowRight,
  Check,
  Code2,
  Copy,
  Download,
  FileText,
  ExternalLink,
  Layers3,
  Mail,
  MapPin,
  X,
  Server,
  Sparkles,
  Briefcase,
  Calendar,
  Zap,
} from 'lucide-react';
import portfolioData from '../../data/portfolio.json';
import { useStore } from '../../store/useStore';

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
const SECTION_VIEWPORT_THRESHOLD_LARGE = 0.34;
const PROGRESS_UPDATE_THRESHOLD = 0.006;

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
  'AI / ML':     'text-[#8af2ff] border-[#8af2ff]/30 bg-[#8af2ff]/8',
  '3D Systems':  'text-[#a855f7] border-[#a855f7]/30 bg-[#a855f7]/8',
  'Full Stack':  'text-primary-dim border-primary/30 bg-primary/8',
};

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
  'Frontend Engineering':    'Responsive interfaces, component systems, and interaction states.',
  'Backend Systems':         'API design, application logic, and structured data handling.',
  'Applied AI':              'Model workflows, evaluation, and production-minded ML usage.',
  'Deployment & Media':      'Cloud delivery, media processing, and 3D asset workflows.',
  'Engineering Foundations': 'Problem solving, debugging, and structured technical thinking.',
};

const heroDots = [
  { id: 1, x: '8%',  y: '22%', size: 14, opacity: 0.18 },
  { id: 2, x: '27%', y: '17%', size: 4,  opacity: 0.24 },
  { id: 3, x: '66%', y: '29%', size: 8,  opacity: 0.10 },
  { id: 4, x: '84%', y: '13%', size: 3,  opacity: 0.16 },
  { id: 5, x: '72%', y: '72%', size: 5,  opacity: 0.10 },
];

// ─── Pure helpers ─────────────────────────────────────────────────────────────

const getProjectCategory = (project: Project) => {
  const s = `${project.title} ${project.subtitle} ${project.tech.join(' ')}`.toLowerCase();
  if (s.includes('flan') || s.includes('disease') || s.includes('ml') || s.includes('ai')) return 'AI / ML';
  if (s.includes('3d') || s.includes('unity') || s.includes('opengl')) return '3D Systems';
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

const getResumeCueArrowPath = (g: ResumeCueGeometry) => {
  const angle = Math.atan2(g.endY - g.controlTwoY, g.endX - g.controlTwoX);
  const wl = 13, ws = 0.58;
  return `M ${g.endX - Math.cos(angle - ws) * wl} ${g.endY - Math.sin(angle - ws) * wl} L ${g.endX} ${g.endY} L ${g.endX - Math.cos(angle + ws) * wl} ${g.endY - Math.sin(angle + ws) * wl}`;
};

const getImplementationFocus = (project: Project) => {
  const s = `${project.title} ${project.subtitle} ${project.tech.join(' ')}`.toLowerCase();
  if (s.includes('agriconnect') || s.includes('express') || s.includes('mongo')) return 'Data flow and service wiring';
  if (s.includes('ppt') || s.includes('flan') || s.includes('polly')) return 'Pipeline orchestration';
  if (s.includes('disease') || s.includes('scikit') || s.includes('knn')) return 'Model evaluation setup';
  if (s.includes('3d') || s.includes('unity') || s.includes('opengl')) return 'Interaction loop behavior';
  return 'Implementation snapshot';
};

const getProjectScopeNotes = (project: Project) => [
  { label: 'Scope',    value: project.subtitle },
  { label: 'Category', value: getProjectCategory(project) },
  { label: 'Stack',    value: project.tech.slice(0, 4).join(', ') },
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
}> = ({ id, children, className = '' }) => {
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, { amount: SECTION_VIEWPORT_THRESHOLD_LARGE });
  const setActiveSection = useStore.getState().setActiveSection;

  useEffect(() => {
    if (isInView) setActiveSection(id);
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
}> = React.memo(({ eyebrow, title, copy, className = '' }) => (
  <motion.div {...reveal} className={`max-w-3xl ${className}`}>
    <p className="mb-3 text-[11px] font-label font-semibold uppercase tracking-[0.26em] text-primary-dim">
      {eyebrow}
    </p>
    <h2 className="text-2xl font-display font-bold leading-tight text-on-surface sm:text-3xl lg:text-4xl">
      {title}
    </h2>
    {copy && (
      <p className="mt-4 text-base leading-8 text-on-surface-variant sm:text-lg">
        {copy}
      </p>
    )}
  </motion.div>
));

const Metric: React.FC<{ value: string; label: string; accent?: boolean }> = React.memo(
  ({ value, label, accent }) => (
    <div className={`surface-panel shimmer-card rounded-2xl p-4 sm:p-5 transition-all duration-300 hover:-translate-y-0.5 ${accent ? 'border-primary/20' : ''}`}>
      <div className={`text-2xl font-display font-bold ${accent ? 'text-primary-dim' : 'text-on-surface'}`}>
        {value}
      </div>
      <div className="mt-1 text-[11px] font-label uppercase tracking-[0.18em] text-on-surface-variant">
        {label}
      </div>
    </div>
  )
);

// ─── ProjectCard ──────────────────────────────────────────────────────────────

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
    if ((event.target as HTMLElement).closest('a, button')) return;
    event.preventDefault();
    onOpenCaseStudy?.(project);
  };

  return (
    <motion.article
      {...reveal}
      tabIndex={0}
      role="button"
      aria-label={`Open ${project.title} case study`}
      data-cursor="view"
      onClick={openFromCard}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') openFromCard(e); }}
      className={`project-card shimmer-card group grid cursor-pointer overflow-hidden rounded-2xl border border-outline-variant transition-all duration-250 hover:border-primary/25 hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
        rail ? 'h-full min-h-0' : 'min-h-[20rem]'
      }`}
    >
      <div className={`flex h-full flex-col ${rail ? 'p-4' : 'p-5 lg:p-6'}`}>

        {/* Header row */}
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
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
                onClick={(e) => { e.preventDefault(); onOpenCaseStudy?.(project); }}
                data-cursor="view"
                aria-label={`Open ${project.title} case study`}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-outline-variant bg-surface/50 text-on-surface-variant transition hover:border-primary/40 hover:text-primary"
              >
                <FileText size={14} />
              </a>
              <a
                href={project.link}
                target="_blank"
                rel="noreferrer"
                data-cursor="view"
                aria-label={`Open ${project.title} source`}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-outline-variant bg-surface/50 text-on-surface-variant transition hover:border-primary/40 hover:text-primary"
              >
                <ExternalLink size={14} />
              </a>
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
        <h3 className={`${rail ? 'mt-1.5 text-[15px]' : 'mt-2.5 text-xl'} font-display font-bold leading-tight text-on-surface`}>
          {project.title}
        </h3>
        <p className={`${rail ? 'mt-2 text-[12px] leading-5 project-description-rail' : 'mt-3 text-sm leading-6'} flex-1 text-on-surface-variant`}>
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
            <div className="mt-5 flex items-center justify-end gap-3">
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
                onClick={(e) => { e.preventDefault(); onOpenCaseStudy?.(project); }}
                data-cursor="view"
                className="inline-flex items-center gap-1.5 rounded-lg border border-outline-variant bg-surface/60 px-4 py-2 text-sm font-semibold text-on-surface transition hover:border-primary/40 hover:text-primary"
              >
                Case study
                <FileText size={14} />
              </a>
              <a
                href={project.link}
                target="_blank"
                rel="noreferrer"
                data-cursor="view"
                className="inline-flex items-center gap-1.5 rounded-lg border border-outline-variant bg-surface/60 px-4 py-2 text-sm font-semibold text-on-surface transition hover:border-primary/40 hover:text-primary"
              >
                Source
                <ExternalLink size={14} />
              </a>
            </div>
          </>
        )}
      </div>
    </motion.article>
  );
});

// ─── SkillCard ────────────────────────────────────────────────────────────────

const SkillCard: React.FC<{ group: SkillGroup; index: number }> = React.memo(({ group, index }) => {
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
    </motion.div>
  );
});

// ─── ContactActions ───────────────────────────────────────────────────────────

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
        className="inline-flex items-center justify-center gap-2 rounded-xl border border-primary/35 bg-primary px-5 py-3 text-sm font-semibold !text-on-primary transition hover:bg-primary-dim"
      >
        <Mail size={17} />
        Send email
      </a>
      <button
        type="button"
        onClick={copyEmail}
        className="inline-flex items-center justify-center gap-2 rounded-xl border border-outline-variant bg-surface-container-high/70 px-5 py-3 text-sm font-semibold text-on-surface transition hover:border-primary/40 hover:text-primary"
      >
        {copied ? <Check size={17} className="text-primary-dim" /> : <Copy size={17} />}
        {copied ? 'Copied!' : 'Copy email'}
      </button>
      <span className="sr-only" aria-live="polite">{copied ? 'Email copied to clipboard' : ''}</span>
    </div>
  );
};

// ─── ProjectCaseStudy ─────────────────────────────────────────────────────────

const ProjectCaseStudy: React.FC<{ project: Project; onClose: () => void }> = ({ project, onClose }) => {
  const lines = project.codePreview ? getCodePreviewLines(project.codePreview, 8) : [];
  const notes = getProjectScopeNotes(project);
  const demo = getProjectDemo(project);

  return (
    <motion.div
      className="case-study-backdrop fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 sm:p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.16, ease: 'easeOut' }}
      role="dialog"
      aria-modal="true"
      aria-label={`${project.title} case study`}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{ backdropFilter: 'blur(12px)' }}
    >
      <motion.article
        className="surface-panel max-h-[min(90dvh,800px)] w-full max-w-5xl overflow-y-auto rounded-2xl"
        initial={{ opacity: 0, y: 18, scale: 0.982 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 14, scale: 0.99 }}
        transition={{ duration: 0.20, ease: [0.22, 1, 0.36, 1] }}
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
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClose(); }}
            aria-label="Close case study"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-outline-variant bg-surface-container-high/70 text-on-surface-variant transition hover:border-primary/40 hover:text-primary"
          >
            <X size={17} />
          </button>
        </div>

        {/* Body */}
        <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="space-y-5">
            <p className="text-base leading-8 text-on-surface-variant">{project.description}</p>

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
                Open the live build or review source for implementation details.
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                {demo && (
                  <a href={demo} target="_blank" rel="noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary/18">
                    Live demo <Zap size={14} />
                  </a>
                )}
                <a href={project.link} target="_blank" rel="noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-outline-variant bg-surface-container-high/70 px-4 py-2 text-sm font-semibold text-on-surface transition hover:border-primary/40 hover:text-primary">
                  View source <ExternalLink size={14} />
                </a>
              </div>
            </div>
          </div>
        </div>
      </motion.article>
    </motion.div>
  );
};

// ─── Main SectionGroup ────────────────────────────────────────────────────────

export const SectionGroup: React.FC = () => {
  const { personal, projects, skills, socials } = portfolioData;
  const overlayRef = useRef<HTMLDivElement>(null);
  const horizontalSectionRef = useRef<HTMLElement>(null);
  const horizontalViewportRef = useRef<HTMLDivElement>(null);
  const horizontalTrackRef = useRef<HTMLDivElement>(null);
  const resumeButtonRef = useRef<HTMLAnchorElement>(null);
  const horizontalTravelRef = useRef(0);
  const lastScrollProgressRef = useRef(0);
  const lastHorizontalProgressRef = useRef(0);
  const lastScrollModeRef = useRef<'vertical' | 'horizontal'>('vertical');
  const railProgressBarRef = useRef<HTMLDivElement>(null);
  const railCounterRef = useRef<HTMLSpanElement>(null);
  const visibleProjectsCountRef = useRef(0);

  const setScrollProgress = useStore((s) => s.setScrollProgress);
  const setHorizontalProgress = useStore((s) => s.setHorizontalProgress);
  const setScrollMode = useStore((s) => s.setScrollMode);
  const setActiveSection = useStore((s) => s.setActiveSection);

  const [projectFilter, setProjectFilter] = useState('All');
  const [showResumeCue, setShowResumeCue] = useState(false);
  const [resumeCueGeometry, setResumeCueGeometry] = useState<ResumeCueGeometry | null>(null);
  const [activeProjectSlug, setActiveProjectSlug] = useState<string | null>(null);

  const openCaseStudy = useCallback((project: Project) => {
    const slug = getProjectSlug(project);
    setActiveProjectSlug(slug);
    window.history.replaceState(null, '', `#project-${slug}`);
  }, []);

  const closeCaseStudy = useCallback(() => {
    setActiveProjectSlug(null);
    if (window.location.hash.startsWith('#project-')) {
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
    }
  }, []);

  // Resume cue animation
  useEffect(() => {
    const measureCue = () => {
      const btn = resumeButtonRef.current;
      if (!btn) return;
      const rect = btn.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const isSmall = window.innerWidth < 640;
      const startX = window.innerWidth / 2;
      const startY = isSmall
        ? Math.max(160, Math.min(window.innerHeight * 0.42, rect.top - 42))
        : window.innerHeight / 2;
      const endX = rect.left + rect.width / 2;
      const endY = rect.top + Math.max(8, rect.height * 0.18);
      const approachY = Math.max(72, endY - Math.min(isSmall ? 64 : 110, window.innerHeight * 0.16));
      setResumeCueGeometry({
        startX, startY, endX, endY,
        controlOneX: startX + (endX - startX) * (isSmall ? 0.12 : 0.2),
        controlOneY: startY - Math.max(isSmall ? 26 : 54, window.innerHeight * (isSmall ? 0.035 : 0.09)),
        controlTwoX: endX,
        controlTwoY: approachY,
      });
    };
    const showTimer = window.setTimeout(() => {
      measureCue();
      if (resumeButtonRef.current?.getBoundingClientRect().width) setShowResumeCue(true);
    }, 900);
    const hideTimer = window.setTimeout(() => setShowResumeCue(false), 6200);
    const dismiss = () => setShowResumeCue(false);
    const sc = document.getElementById('scroll-container');
    window.addEventListener('keydown', dismiss, { once: true });
    window.addEventListener('resize', measureCue, { passive: true });
    sc?.addEventListener('scroll', dismiss, { once: true, passive: true });
    return () => {
      window.clearTimeout(showTimer);
      window.clearTimeout(hideTimer);
      window.removeEventListener('keydown', dismiss);
      window.removeEventListener('resize', measureCue);
      sc?.removeEventListener('scroll', dismiss);
    };
  }, []);

  const allSkills = useMemo(() => skills.flatMap((g) => g.items), [skills]);
  const projectFilters = useMemo(
    () => ['All', ...Array.from(new Set(projects.map(getProjectCategory)))],
    [projects],
  );
  const visibleProjects = useMemo(
    () => projects.filter((p) => projectFilter === 'All' || getProjectCategory(p) === projectFilter),
    [projectFilter, projects],
  );
  visibleProjectsCountRef.current = visibleProjects.length;

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
    if (!activeProject) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeCaseStudy(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeProject, closeCaseStudy]);

  // Horizontal rail sizing
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
    const vs = window.getComputedStyle(viewport);
    const visibleWidth = viewport.clientWidth - parseFloat(vs.paddingLeft || '0') - parseFloat(vs.paddingRight || '0');
    const travel = Math.max(0, track.scrollWidth - Math.max(1, visibleWidth));
    horizontalTravelRef.current = travel;
    section.style.height = `${Math.max(window.innerHeight, Math.ceil(window.innerHeight + travel))}px`;
    track.style.setProperty('--rail-x', `${-currentProgress * travel}px`);
  }, []);

  // Main scroll handler
  const updateScrollState = useCallback(() => {
    const sc = overlayRef.current;
    if (!sc) return;
    const useWindow = window.innerWidth < 768;
    const scrollTop = useWindow ? window.scrollY : sc.scrollTop;
    const scrollHeight = useWindow
      ? document.documentElement.scrollHeight - window.innerHeight
      : sc.scrollHeight - sc.clientHeight;
    const progress = Math.min(1, Math.max(0, scrollTop / Math.max(1, scrollHeight)));

    if (Math.abs(progress - lastScrollProgressRef.current) > PROGRESS_UPDATE_THRESHOLD) {
      lastScrollProgressRef.current = progress;
      setScrollProgress(progress);
    }

    const hSection = horizontalSectionRef.current;
    const railTrack = horizontalTrackRef.current;
    if (hSection && window.innerWidth >= 1024) {
      const rect = hSection.getBoundingClientRect();
      const travelDistance = Math.max(1, horizontalTravelRef.current);
      const hasTravel = horizontalTravelRef.current > 0;
      const segmentProgress = hasTravel ? Math.min(1, Math.max(0, -rect.top / travelDistance)) : 0;
      const inSegment = hasTravel && rect.top <= 0 && rect.bottom >= window.innerHeight;

      if (
        Math.abs(segmentProgress - lastHorizontalProgressRef.current) > PROGRESS_UPDATE_THRESHOLD ||
        (segmentProgress === 0 && lastHorizontalProgressRef.current !== 0) ||
        (segmentProgress === 1 && lastHorizontalProgressRef.current !== 1)
      ) {
        lastHorizontalProgressRef.current = segmentProgress;
        setHorizontalProgress(segmentProgress);
        if (railProgressBarRef.current) {
          railProgressBarRef.current.style.width = `${Math.round(segmentProgress * 100)}%`;
        }
        if (railCounterRef.current) {
          const n = Math.min(
            visibleProjectsCountRef.current,
            Math.max(1, Math.round(segmentProgress * visibleProjectsCountRef.current) || 1),
          );
          railCounterRef.current.textContent = `${n}/${visibleProjectsCountRef.current}`;
        }
      }

      const nextMode = inSegment ? 'horizontal' : 'vertical';
      if (lastScrollModeRef.current !== nextMode) {
        lastScrollModeRef.current = nextMode;
        setScrollMode(nextMode);
      }

      railTrack?.style.setProperty('--rail-x', `${-segmentProgress * horizontalTravelRef.current}px`);
      if (inSegment) setActiveSection('projects');
    } else {
      if (lastHorizontalProgressRef.current !== 0) {
        lastHorizontalProgressRef.current = 0;
        setHorizontalProgress(0);
        if (railProgressBarRef.current) railProgressBarRef.current.style.width = '0%';
        if (railCounterRef.current) railCounterRef.current.textContent = `1/${visibleProjectsCountRef.current}`;
      }
      if (lastScrollModeRef.current !== 'vertical') {
        lastScrollModeRef.current = 'vertical';
        setScrollMode('vertical');
      }
      railTrack?.style.setProperty('--rail-x', '0px');
    }
  }, [setActiveSection, setHorizontalProgress, setScrollMode, setScrollProgress]);

  // Scroll event binding
  useEffect(() => {
    const sc = overlayRef.current;
    if (!sc) return;
    let frame = 0, ticking = false, idleFrame = 0;

    const scheduleUpdate = () => {
      if (!ticking) {
        window.cancelAnimationFrame(frame);
        frame = window.requestAnimationFrame(() => { updateScrollState(); ticking = false; });
        ticking = true;
      }
      window.cancelAnimationFrame(idleFrame);
      idleFrame = window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => { updateScrollState(); });
      });
    };

    let resizeTimeout: number;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = window.setTimeout(() => { updateHorizontalTravel(); scheduleUpdate(); }, 150);
    };

    updateHorizontalTravel();
    updateScrollState();
    window.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('resize', handleResize, { passive: true });
    sc.addEventListener('scroll', scheduleUpdate, { passive: true });

    return () => {
      window.cancelAnimationFrame(frame);
      window.cancelAnimationFrame(idleFrame);
      clearTimeout(resizeTimeout);
      window.removeEventListener('scroll', scheduleUpdate);
      window.removeEventListener('resize', handleResize);
      sc.removeEventListener('scroll', scheduleUpdate);
    };
  }, [updateHorizontalTravel, updateScrollState]);

  // ResizeObserver for rail
  useEffect(() => {
    const viewport = horizontalViewportRef.current;
    const track = horizontalTrackRef.current;
    if (!viewport || !track || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => { updateHorizontalTravel(); updateScrollState(); });
    observer.observe(viewport);
    observer.observe(track);
    return () => observer.disconnect();
  }, [visibleProjects.length, updateHorizontalTravel, updateScrollState]);

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div ref={overlayRef} id="scroll-container" className="ui-overlay">
      {/* Background grid */}
      <div
        className="fixed inset-0 z-0 pointer-events-none cyber-grid opacity-60"
        style={{ contain: 'strict' }}
        aria-hidden="true"
      />

      <main className="relative z-10">
        <AnimatePresence>
          {activeProject && (
            <ProjectCaseStudy key={`cs-${activeProject.id}`} project={activeProject} onClose={closeCaseStudy} />
          )}

          {/* Resume cue SVG animation */}
          {showResumeCue && resumeCueGeometry && (
            <motion.div
              key="resume-cue"
              data-resume-cue
              className="pointer-events-none fixed inset-0 z-40 overflow-hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.45, ease: 'easeOut' }}
            >
              <motion.div
                className="resume-cue-veil absolute inset-0 bg-background/20"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 1, 1, 0] }}
                transition={{ duration: 4.8, times: [0, 0.18, 0.74, 1], ease: 'easeInOut' }}
              />
              <svg className="absolute inset-0 h-full w-full" aria-hidden="true">
                <defs>
                  <linearGradient id="rcg" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%"   stopColor="var(--tertiary)" stopOpacity="0.05" />
                    <stop offset="45%"  stopColor="var(--tertiary)" stopOpacity="0.95" />
                    <stop offset="100%" stopColor="var(--primary)"  stopOpacity="0.95" />
                  </linearGradient>
                  <filter id="rcglow" x="-30%" y="-30%" width="160%" height="160%">
                    <feGaussianBlur stdDeviation="4" result="blur" />
                    <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                  </filter>
                </defs>
                <motion.path d={getResumeCuePath(resumeCueGeometry)} fill="none" stroke="url(#rcg)" strokeWidth="2" strokeLinecap="round" filter="url(#rcglow)"
                  initial={{ pathLength: 0, opacity: 0, pathOffset: 0.16 }}
                  animate={{ pathLength: [0, 1, 1], opacity: [0, 1, 0], pathOffset: [0.16, 0, 0] }}
                  transition={{ duration: 4.6, times: [0, 0.72, 1], ease: 'easeInOut' }} />
                <motion.circle r="8" fill="var(--primary)" filter="url(#rcglow)"
                  style={{ offsetPath: `path('${getResumeCuePath(resumeCueGeometry)}')` }}
                  initial={{ offsetDistance: "0%", opacity: 0, scale: 0.4 }}
                  animate={{ offsetDistance: ["0%","100%"], opacity: [0,1,1,0], scale: [0.4,1,0.9,0.45] }}
                  transition={{ duration: 4.25, times: [0,0.32,0.76,1], ease: 'easeInOut' }} />
                <motion.path d={getResumeCueArrowPath(resumeCueGeometry)} fill="none" stroke="var(--primary)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" filter="url(#rcglow)"
                  initial={{ opacity: 0, pathLength: 0 }}
                  animate={{ opacity: [0,0,1,0], pathLength: [0,0,1,1] }}
                  transition={{ duration: 4.4, times: [0,0.58,0.74,1], ease: 'easeInOut' }} />
              </svg>
              <motion.div
                className="absolute rounded-full border border-tertiary/25 bg-surface/80 px-3 py-1.5 text-[10px] font-label uppercase tracking-[0.18em] text-tertiary shadow-xl shadow-tertiary/10"
                style={{ left: resumeCueGeometry.startX, top: resumeCueGeometry.startY, transform: 'translate(-50%,-50%)' }}
                initial={{ opacity: 0, y: 10, filter: 'blur(8px)' }}
                animate={{ opacity: [0,1,1,0], y: [10,0,0,-8], filter: ['blur(8px)','blur(0px)','blur(0px)','blur(8px)'] }}
                transition={{ duration: 4.2, times: [0,0.16,0.72,1], ease: 'easeOut' }}
              >
                Resume download
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── HERO ─────────────────────────────────────────────────────── */}
        <SectionShell
          id="hero"
          className="flex min-h-[100svh] flex-col justify-center overflow-hidden px-5 pb-10 pt-24 sm:px-8 lg:px-12 xl:px-16"
        >
          {/* Decorative dots */}
          <div className="pointer-events-none absolute inset-0" aria-hidden="true">
            {heroDots.map((dot) => (
              <span
                key={dot.id}
                className="absolute rounded-full bg-primary"
                style={{ left: dot.x, top: dot.y, width: dot.size, height: dot.size, opacity: dot.opacity }}
              />
            ))}
          </div>

          <div className="mx-auto w-full min-w-0 max-w-screen-xl">
            <motion.div {...reveal} className="max-w-3xl relative z-10">
              {/* Status badge */}
              <div className="mb-6 inline-flex items-center gap-2.5 rounded-full border border-primary/20 bg-primary/6 px-4 py-2 text-[11px] font-label font-semibold uppercase tracking-[0.20em] text-primary-dim">
                <span className="status-dot h-2 w-2 rounded-full bg-primary-dim" />
                Available for new roles
              </div>

              <h1 className="text-4xl font-display font-bold leading-[0.96] text-on-surface sm:text-5xl lg:text-6xl xl:text-[4.5rem]">
                {personal.name}
                <span
                  className="mt-3 block bg-clip-text text-transparent"
                  style={{ backgroundImage: 'linear-gradient(135deg, var(--title-gradient-from), var(--title-gradient-via), var(--title-gradient-to))' }}
                >
                  {personal.title}
                </span>
              </h1>

              <p className="mt-6 max-w-2xl text-base leading-7 text-on-surface-variant sm:text-lg sm:leading-8">
                {personal.bio}
              </p>
            </motion.div>

            {/* CTAs */}
            <motion.div {...reveal} className="relative z-10 mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => document.getElementById('projects')?.scrollIntoView({ behavior: 'smooth' })}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-sm font-bold text-on-primary transition hover:bg-primary-dim active:scale-[0.98]"
              >
                View projects
                <ArrowRight size={17} />
              </button>
              <a
                ref={resumeButtonRef}
                href={`${import.meta.env.BASE_URL}resume.pdf`}
                className={`relative inline-flex items-center justify-center gap-2 rounded-xl border px-6 py-3.5 text-sm font-semibold transition active:scale-[0.98] ${
                  showResumeCue
                    ? 'z-50 border-tertiary/40 bg-surface-container-high text-tertiary shadow-2xl shadow-tertiary/10 ring-1 ring-tertiary/25'
                    : 'border-outline-variant bg-surface-container-high/70 text-on-surface hover:border-tertiary/40 hover:text-tertiary'
                }`}
              >
                <Download size={17} />
                Resume
              </a>
            </motion.div>

            {/* Metric grid */}
            <motion.div {...reveal} className="relative z-10 mt-8 grid max-w-sm gap-3 grid-cols-3">
              <Metric value={`${projects.length}+`} label="Projects" accent />
              <Metric value={`${allSkills.length}+`} label="Skills" />
              <Metric value="3" label="Domains" />
            </motion.div>

            {/* Domain tags */}
            <motion.div {...revealFast} className="relative z-10 mt-5 flex max-w-xl flex-wrap gap-2 text-[11px] font-label uppercase tracking-[0.16em] text-on-surface-variant">
              {['Practical AI', 'Full-stack systems', 'Interactive 3D'].map((tag) => (
                <span key={tag} className="rounded-full border border-outline-variant bg-surface-container-high/55 px-3 py-1.5">
                  {tag}
                </span>
              ))}
            </motion.div>
          </div>
        </SectionShell>

        {/* ── PROJECTS ─────────────────────────────────────────────────── */}
        <section
          id="projects"
          ref={horizontalSectionRef}
          className="horizontal-drive relative min-h-screen px-5 pb-16 pt-24 sm:px-8 lg:px-0 lg:pb-0 lg:pt-10"
        >
          <div className="lg:sticky lg:top-16 lg:flex lg:h-[calc(100svh-4rem)] lg:flex-col lg:justify-start lg:overflow-hidden">
            <div className="mx-auto w-full min-w-0 max-w-screen-2xl py-12 lg:max-w-none lg:py-6">
              <div className="px-0 lg:px-12 xl:px-16">
                <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                  <SectionHeading
                    eyebrow={sectionCopy.projects.eyebrow}
                    title={sectionCopy.projects.title}
                    copy={sectionCopy.projects.copy}
                  />
                  <a
                    href="https://github.com/AyushBajaj7"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 self-start rounded-xl border border-outline-variant bg-surface-container-high/65 px-5 py-2.5 text-sm font-semibold text-on-surface transition hover:border-primary/40 hover:text-primary"
                  >
                    <Code2 size={16} />
                    GitHub
                  </a>
                </div>

                {/* Filter buttons */}
                <div className="mb-4 flex flex-wrap gap-2">
                  {projectFilters.map((filter) => (
                    <button
                      key={filter}
                      type="button"
                      onClick={() => setProjectFilter(filter)}
                      className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${
                        projectFilter === filter
                          ? 'border-primary bg-primary text-on-primary'
                          : 'border-outline-variant bg-surface-container-high/60 text-on-surface-variant hover:border-primary/40 hover:text-primary'
                      }`}
                    >
                      {filter}
                    </button>
                  ))}
                </div>
              </div>

              {/* Desktop horizontal rail */}
              <div ref={horizontalViewportRef} className="hidden overflow-hidden px-12 xl:px-16 lg:block">
                <div className="mb-3 flex items-center justify-between gap-6">
                  <div className="flex items-center gap-2.5 text-[11px] font-label uppercase tracking-[0.2em] text-on-surface-variant">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary-dim" />
                    Project rail
                  </div>
                  <div className="h-0.5 w-48 overflow-hidden rounded-full bg-surface-container-high">
                    <div
                      ref={railProgressBarRef}
                      className="h-full rounded-full bg-gradient-to-r from-primary to-tertiary transition-none"
                      style={{ width: '0%' }}
                    />
                  </div>
                </div>

                <div className="mb-3 flex items-center justify-between gap-6 text-[11px] font-label uppercase tracking-[0.18em] text-on-surface-variant">
                  <span ref={railCounterRef}>1/{visibleProjects.length} visible</span>
                  <span>{projectFilter === 'All' ? 'All categories' : projectFilter}</span>
                </div>

                <div ref={horizontalTrackRef} className="horizontal-track flex w-max items-stretch gap-5 py-2">
                  <div className="hidden w-[8vw] min-w-8 flex-none xl:block" aria-hidden="true" />

                  {/* Intro card */}
                  <div className="surface-panel shimmer-card flex h-[var(--project-rail-card-height)] w-[20rem] flex-none flex-col justify-between rounded-2xl p-5 xl:w-[21rem]">
                    <div>
                      <div className="mb-3 flex items-center gap-2">
                        <Briefcase size={14} className="text-primary-dim" />
                        <p className="text-[10px] font-label uppercase tracking-[0.22em] text-primary-dim">Overview</p>
                      </div>
                      <h3 className="text-xl font-display font-bold leading-tight text-on-surface">
                        Real projects with technical context.
                      </h3>
                    </div>
                    <p className="text-sm leading-6 text-on-surface-variant">
                      Four projects with scope, stack, and implementation notes.
                    </p>
                  </div>

                  {visibleProjects.map((project, index) => (
                    <div key={project.id} className="flex h-[var(--project-rail-card-height)] w-[20rem] flex-none flex-col xl:w-[21rem]">
                      <ProjectCard project={project} index={index} rail onOpenCaseStudy={openCaseStudy} />
                    </div>
                  ))}

                  {/* Continue card */}
                  <button
                    type="button"
                    onClick={() => document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' })}
                    className="surface-panel shimmer-card group flex h-[var(--project-rail-card-height)] w-[20rem] flex-none flex-col justify-between rounded-2xl p-5 text-left transition hover:border-primary/35 xl:w-[21rem]"
                  >
                    <span className="text-[10px] font-label uppercase tracking-[0.22em] text-primary-dim">Next</span>
                    <span className="text-xl font-display font-bold leading-tight text-on-surface">Continue to profile.</span>
                    <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-primary text-on-primary transition group-hover:translate-x-1.5">
                      <ArrowRight size={20} />
                    </span>
                  </button>

                  <div className="hidden w-[16vw] min-w-16 flex-none xl:block" aria-hidden="true" />
                </div>
              </div>

              {/* Mobile/tablet grid */}
              <div className="grid gap-5 md:grid-cols-2 lg:hidden">
                {visibleProjects.map((project, index) => (
                  <ProjectCard key={project.id} project={project} index={index} onOpenCaseStudy={openCaseStudy} />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── ABOUT ────────────────────────────────────────────────────── */}
        <SectionShell id="about" className="px-5 py-24 sm:px-8 lg:px-16 lg:py-28">
          <div className="mr-auto max-w-4xl grid gap-10 lg:grid-cols-2 lg:items-start">
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

              {/* Domain metrics */}
              <div className="grid grid-cols-3 gap-3">
                <Metric value="AI" label="Pipelines" accent />
                <Metric value="Web" label="Platforms" />
                <Metric value="3D" label="Systems" />
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
        <SectionShell id="skills" className="px-5 py-24 sm:px-8 lg:px-16 lg:py-28">
          <div className="mr-auto max-w-screen-2xl">
            <SectionHeading
              eyebrow={sectionCopy.skills.eyebrow}
              title={sectionCopy.skills.title}
              copy={sectionCopy.skills.copy}
            />
            <div className="mt-10 grid max-w-4xl gap-4 md:grid-cols-2">
              {skills.map((group, index) => (
                <SkillCard key={group.category} group={group} index={index} />
              ))}
            </div>
          </div>
        </SectionShell>

        {/* ── CONTACT ──────────────────────────────────────────────────── */}
        <SectionShell id="contact" className="px-5 py-24 sm:px-8 lg:px-16 lg:py-28">
          <div className="mr-auto max-w-2xl grid gap-10">
            <SectionHeading
              eyebrow={sectionCopy.contact.eyebrow}
              title={sectionCopy.contact.title}
              copy={sectionCopy.contact.copy}
            />

            <motion.div {...reveal} className="surface-panel shimmer-card rounded-2xl p-6 sm:p-8">
              {/* Availability badge */}
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/6 px-3 py-1.5 text-[11px] font-label uppercase tracking-[0.18em] text-primary-dim">
                <span className="status-dot h-1.5 w-1.5 rounded-full bg-primary-dim" />
                Open to opportunities
              </div>

              <div className="mb-7">
                <p className="text-[10px] font-label uppercase tracking-[0.22em] text-on-surface-variant mb-2">Email</p>
                <a
                  href={`mailto:${personal.email}`}
                  className="text-xl font-display font-bold text-on-surface transition hover:text-primary sm:text-2xl"
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
              </div>
            </motion.div>
          </div>
        </SectionShell>
      </main>
    </div>
  );
};
