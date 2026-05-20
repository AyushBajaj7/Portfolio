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

const getResumeCuePath = (geometry: ResumeCueGeometry) =>
  `M ${geometry.startX} ${geometry.startY} C ${geometry.controlOneX} ${geometry.controlOneY}, ${geometry.controlTwoX} ${geometry.controlTwoY}, ${geometry.endX} ${geometry.endY}`;

const getProjectSlug = (project: Project) =>
  project.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

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

const getProjectScopeNotes = (project: Project) => {
  const category = getProjectCategory(project);
  const tech = project.tech.slice(0, 4).join(', ');

  return [
    { label: 'Scope', value: project.subtitle },
    { label: 'Category', value: category },
    { label: 'Stack', value: tech },
  ];
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

const ProjectCard: React.FC<{
  project: Project;
  index: number;
  rail?: boolean;
  onOpenCaseStudy?: (project: Project) => void;
}> = ({
  project,
  index,
  rail = false,
  onOpenCaseStudy,
}) => {
  const previewLines = project.codePreview ? getCodePreviewLines(project.codePreview, rail ? 1 : 4) : [];
  const totalLines = project.codePreview ? getCodePreviewLineCount(project.codePreview) : 0;
  const slug = getProjectSlug(project);

  return (
    <motion.article
      {...reveal}
      className={`project-card group grid overflow-hidden rounded-xl border border-outline-variant transition-[border-color,box-shadow] duration-200 hover:border-primary/30 ${
        rail ? 'h-full min-h-0' : 'min-h-[20rem]'
      }`}
    >
      <div className={`flex h-full flex-col ${rail ? 'p-3.5' : 'p-5 lg:p-6'}`}>
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-outline-variant bg-surface/64 px-3 py-1 text-xs font-label uppercase tracking-[0.18em] text-on-surface-variant">
              {String(index + 1).padStart(2, '0')}
            </span>
            <span className="text-[11px] font-label uppercase tracking-[0.18em] text-on-surface-variant">
              {getProjectCategory(project)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {rail && (
              <a
                href={`#project-${slug}`}
                onClick={(event) => {
                  event.preventDefault();
                  onOpenCaseStudy?.(project);
                }}
                data-cursor="view"
                aria-label={`Open ${project.title} case study`}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-outline-variant bg-surface/55 text-on-surface-variant transition hover:border-primary/45 hover:text-primary"
              >
                <FileText size={15} />
              </a>
            )}
            {rail && (
              <a
                href={project.link}
                target="_blank"
                rel="noreferrer"
                data-cursor="view"
                aria-label={`Open ${project.title} source`}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-outline-variant bg-surface/55 text-on-surface-variant transition hover:border-primary/45 hover:text-primary"
              >
                <ExternalLink size={15} />
              </a>
            )}
          </div>
        </div>
        <p className={`${rail ? 'text-[11px]' : 'text-xs'} font-label uppercase tracking-[0.18em] text-primary-dim`}>
          {project.subtitle}
        </p>
        <h3 className={`${rail ? 'mt-2 text-base' : 'mt-3 text-xl'} font-display font-bold leading-tight text-on-surface`}>
          {project.title}
        </h3>
        <p className={`${rail ? 'mt-2 text-[12px] leading-5 project-description-rail' : 'mt-4 text-sm leading-6'} flex-1 text-on-surface-variant`}>
          {project.description}
        </p>

        {previewLines.length > 0 && (
          <div className={`${rail ? 'mt-2' : 'mt-4'} overflow-hidden rounded-xl border border-outline-variant bg-surface/72`}>
            <div className={`flex items-start justify-between gap-4 ${rail ? 'px-3 py-2' : 'border-b border-outline-variant px-4 py-3'}`}>
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

            {!rail && (
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
            )}
          </div>
        )}

        {!rail && (
          <>
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
                href={`#project-${slug}`}
                onClick={(event) => {
                  event.preventDefault();
                  onOpenCaseStudy?.(project);
                }}
                data-cursor="view"
                className="inline-flex items-center gap-2 rounded-lg border border-outline-variant bg-surface/70 px-4 py-2 text-sm font-semibold text-on-surface transition hover:border-primary/45 hover:text-primary"
              >
                Case study
                <FileText size={16} />
              </a>
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
          </>
        )}
      </div>
    </motion.article>
  );
};

const SkillCard: React.FC<{ group: SkillGroup; index: number }> = ({ group, index }) => {
  const Icon = skillIcons[index % skillIcons.length];

  return (
    <motion.div {...reveal} className="surface-panel-subtle rounded-xl p-5">
      <div className="mb-4 flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/8 text-primary">
          <Icon size={20} />
        </div>
        <div>
          <h3 className="text-lg font-display font-bold text-on-surface">{group.category}</h3>
          <p className="mt-1 text-sm leading-6 text-on-surface-variant">
            {capabilitySummaries[group.category] ?? 'Tools and habits used repeatedly across the work.'}
          </p>
        </div>
      </div>
      <div className="grid gap-2">
        {group.items.map((item) => (
          <div key={item} className="flex items-center gap-3 text-sm leading-6 text-on-surface-variant">
            <Check size={15} className="text-primary-dim" />
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

const ProjectCaseStudy: React.FC<{
  project: Project;
  onClose: () => void;
}> = ({ project, onClose }) => {
  const lines = project.codePreview ? getCodePreviewLines(project.codePreview, 8) : [];
  const notes = getProjectScopeNotes(project);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end justify-center bg-background/72 px-4 pb-4 pt-16 sm:items-center sm:p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      role="dialog"
      aria-modal="true"
      aria-label={`${project.title} case study`}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <motion.article
        className="surface-panel max-h-[86vh] w-full max-w-5xl overflow-y-auto rounded-xl"
        initial={{ opacity: 0, y: 18, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.99 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-outline-variant p-5 sm:p-7">
          <div className="min-w-0">
            <p className="text-xs font-label uppercase tracking-[0.22em] text-primary-dim">
              Case study
            </p>
            <h2 className="mt-3 text-2xl font-display font-bold leading-tight text-on-surface sm:text-3xl">
              {project.title}
            </h2>
            <p className="mt-3 text-sm font-label uppercase tracking-[0.16em] text-on-surface-variant">
              {project.subtitle}
            </p>
          </div>
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onClose();
            }}
            aria-label="Close case study"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-outline-variant bg-surface-container-high/70 text-on-surface-variant transition hover:border-primary/45 hover:text-primary"
          >
            <X size={18} />
          </button>
        </div>

        <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="space-y-5">
            <p className="text-base leading-8 text-on-surface-variant">
              {project.description}
            </p>

            <div className="grid gap-3 sm:grid-cols-3">
              {notes.map((note) => (
                <div key={note.label} className="rounded-lg border border-outline-variant bg-surface/52 p-4">
                  <p className="text-[10px] font-label uppercase tracking-[0.2em] text-on-surface-variant">
                    {note.label}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-on-surface">{note.value}</p>
                </div>
              ))}
            </div>

            <div>
              <p className="mb-3 text-[10px] font-label uppercase tracking-[0.2em] text-on-surface-variant">
                Tools used
              </p>
              <div className="flex flex-wrap gap-2">
                {project.tech.map((tech) => (
                  <span
                    key={tech}
                    className="rounded-full border border-outline-variant bg-surface-container-high/60 px-3 py-1.5 text-xs text-on-surface-variant"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-outline-variant bg-surface/74">
            <div className="flex items-start justify-between gap-4 border-b border-outline-variant px-4 py-3">
              <div>
                <p className="text-[10px] font-label uppercase tracking-[0.2em] text-on-surface-variant">
                  Technical note
                </p>
                <p className="mt-1 text-xs font-label uppercase tracking-[0.16em] text-primary-dim">
                  {getImplementationFocus(project)}
                </p>
              </div>
              <span className="rounded-full border border-outline-variant bg-surface/70 px-3 py-1 text-[10px] font-label uppercase tracking-[0.16em] text-on-surface-variant">
                {getCodePreviewLineCount(project.codePreview)} lines
              </span>
            </div>

            <div className="px-4 py-3">
              {lines.map((line, index) => (
                <div
                  key={`${project.id}-detail-${index}`}
                  className={`grid grid-cols-[2rem_minmax(0,1fr)] gap-3 py-2 ${
                    index === 0 ? '' : 'border-t border-outline-variant/60'
                  }`}
                >
                  <span className="text-[10px] font-label uppercase tracking-[0.16em] text-on-surface-variant/70">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <code className="block overflow-hidden text-ellipsis whitespace-nowrap text-xs leading-6 text-on-surface">
                    {line}
                  </code>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-3 border-t border-outline-variant p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm leading-6 text-on-surface-variant">
                Source link opens the repository for the full implementation.
              </p>
              <a
                href={project.link}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-outline-variant bg-surface-container-high/70 px-4 py-2 text-sm font-semibold text-on-surface transition hover:border-primary/45 hover:text-primary"
              >
                View source
                <ExternalLink size={16} />
              </a>
            </div>
          </div>
        </div>
      </motion.article>
    </motion.div>
  );
};

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
  const setScrollProgress = useStore((state) => state.setScrollProgress);
  const setHorizontalProgress = useStore((state) => state.setHorizontalProgress);
  const setScrollMode = useStore((state) => state.setScrollMode);
  const setActiveSection = useStore((state) => state.setActiveSection);
  const [projectFilter, setProjectFilter] = useState('All');
  const [horizontalProgress, setLocalRailProgress] = useState(0);
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

  useEffect(() => {
    const measureCue = () => {
      const resumeButton = resumeButtonRef.current;
      if (!resumeButton) return;

      const rect = resumeButton.getBoundingClientRect();
      const startX = window.innerWidth / 2;
      const startY = window.innerHeight / 2;
      const endX = rect.left + rect.width / 2;
      const endY = rect.top + Math.max(8, rect.height * 0.18);
      const approachY = Math.max(72, endY - Math.min(110, window.innerHeight * 0.16));

      setResumeCueGeometry({
        startX,
        startY,
        endX,
        endY,
        controlOneX: startX + (endX - startX) * 0.2,
        controlOneY: startY - Math.max(54, window.innerHeight * 0.09),
        controlTwoX: endX,
        controlTwoY: approachY,
      });
    };

    const showTimer = window.setTimeout(() => {
      measureCue();
      setShowResumeCue(true);
    }, 700);
    const hideTimer = window.setTimeout(() => setShowResumeCue(false), 6200);
    const dismiss = () => setShowResumeCue(false);
    const scrollContainer = document.getElementById('scroll-container');

    window.addEventListener('keydown', dismiss, { once: true });
    window.addEventListener('resize', measureCue, { passive: true });
    scrollContainer?.addEventListener('scroll', dismiss, { once: true, passive: true });

    return () => {
      window.clearTimeout(showTimer);
      window.clearTimeout(hideTimer);
      window.removeEventListener('keydown', dismiss);
      window.removeEventListener('resize', measureCue);
      scrollContainer?.removeEventListener('scroll', dismiss);
    };
  }, []);

  const allSkills = useMemo(() => skills.flatMap((group) => group.items), [skills]);
  const projectFilters = useMemo(
    () => ['All', ...Array.from(new Set(projects.map(getProjectCategory)))],
    [projects],
  );
  const visibleProjects = useMemo(
    () => projects.filter((project) => projectFilter === 'All' || getProjectCategory(project) === projectFilter),
    [projectFilter, projects],
  );
  const activeProject = useMemo(
    () => projects.find((project) => getProjectSlug(project) === activeProjectSlug) ?? null,
    [activeProjectSlug, projects],
  );

  useEffect(() => {
    const syncProjectFromHash = () => {
      const slug = window.location.hash.replace('#project-', '');
      if (!slug || slug === window.location.hash) {
        setActiveProjectSlug(null);
        return;
      }

      setActiveProjectSlug(projects.some((project) => getProjectSlug(project) === slug) ? slug : null);
    };

    syncProjectFromHash();
    window.addEventListener('hashchange', syncProjectFromHash);
    return () => window.removeEventListener('hashchange', syncProjectFromHash);
  }, [projects]);

  useEffect(() => {
    if (!activeProject) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeCaseStudy();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeProject, closeCaseStudy]);

  const handleOverlayWheel = useCallback((event: React.WheelEvent<HTMLDivElement>) => {
    const scrollContainer = overlayRef.current;
    if (!scrollContainer || event.defaultPrevented) return;

    const previousScrollTop = scrollContainer.scrollTop;
    const wheelDelta = Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? event.deltaY : event.deltaX;

    window.requestAnimationFrame(() => {
      if (Math.abs(wheelDelta) > 0 && scrollContainer.scrollTop === previousScrollTop) {
        scrollContainer.scrollTop += wheelDelta;
      }
    });
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
    const viewportStyle = window.getComputedStyle(viewport);
    const visibleWidth =
      viewport.clientWidth -
      Number.parseFloat(viewportStyle.paddingLeft || '0') -
      Number.parseFloat(viewportStyle.paddingRight || '0');
    const travel = Math.max(0, track.scrollWidth - Math.max(1, visibleWidth));
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

  useEffect(() => {
    const viewport = horizontalViewportRef.current;
    const section = horizontalSectionRef.current;
    const scrollContainer = overlayRef.current;
    if (!viewport || !section || !scrollContainer) return;

    const handleWheel = (event: WheelEvent) => {
      if (window.innerWidth < 1024) return;

      const rect = section.getBoundingClientRect();
      const inHorizontalSegment = rect.top <= HORIZONTAL_SEGMENT_THRESHOLD && rect.bottom >= window.innerHeight;
      if (!inHorizontalSegment) return;

      event.preventDefault();
      const wheelDelta = Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? event.deltaY : event.deltaX;
      scrollContainer.scrollTop += wheelDelta;
    };

    viewport.addEventListener('wheel', handleWheel, { capture: true, passive: false });

    return () => {
      viewport.removeEventListener('wheel', handleWheel, { capture: true });
    };
  }, []);

  return (
    <div ref={overlayRef} id="scroll-container" className="ui-overlay" onWheelCapture={handleOverlayWheel}>
      <div className="fixed inset-0 z-0 pointer-events-none cyber-grid opacity-70" />

      <main className="relative z-10">
        <AnimatePresence>
          {activeProject && (
            <ProjectCaseStudy key={`case-study-${activeProject.id}`} project={activeProject} onClose={closeCaseStudy} />
          )}

          {showResumeCue && resumeCueGeometry && (
            <motion.div
              key="resume-cue"
              className="pointer-events-none fixed inset-0 z-40 overflow-hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.45, ease: 'easeOut' }}
            >
              <motion.div
                className="absolute inset-0 bg-background/28 backdrop-blur-[2px]"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 1, 1, 0] }}
                transition={{ duration: 4.8, times: [0, 0.18, 0.74, 1], ease: 'easeInOut' }}
              />

              <svg className="absolute inset-0 h-full w-full" aria-hidden="true">
                <defs>
                  <linearGradient id="resume-cue-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="var(--tertiary)" stopOpacity="0.05" />
                    <stop offset="45%" stopColor="var(--tertiary)" stopOpacity="0.95" />
                    <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.95" />
                  </linearGradient>
                  <filter id="resume-cue-glow" x="-30%" y="-30%" width="160%" height="160%">
                    <feGaussianBlur stdDeviation="4" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                  <marker
                    id="resume-cue-arrowhead"
                    markerWidth="10"
                    markerHeight="10"
                    refX="8"
                    refY="5"
                    orient="auto"
                    markerUnits="strokeWidth"
                  >
                    <path
                      d="M 1 1 L 8 5 L 1 9"
                      fill="none"
                      stroke="var(--primary)"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </marker>
                </defs>

                <motion.path
                  d={getResumeCuePath(resumeCueGeometry)}
                  fill="none"
                  stroke="url(#resume-cue-gradient)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  filter="url(#resume-cue-glow)"
                  markerEnd="url(#resume-cue-arrowhead)"
                  initial={{ pathLength: 0, opacity: 0, pathOffset: 0.16 }}
                  animate={{ pathLength: [0, 1, 1], opacity: [0, 1, 0], pathOffset: [0.16, 0, 0] }}
                  transition={{ duration: 4.6, times: [0, 0.72, 1], ease: 'easeInOut' }}
                />

                <motion.circle
                  r="8"
                  fill="var(--primary)"
                  filter="url(#resume-cue-glow)"
                  initial={{ cx: resumeCueGeometry.startX, cy: resumeCueGeometry.startY, opacity: 0, scale: 0.4 }}
                  animate={{
                    cx: [
                      resumeCueGeometry.startX,
                      resumeCueGeometry.controlOneX,
                      resumeCueGeometry.controlTwoX,
                      resumeCueGeometry.endX,
                    ],
                    cy: [
                      resumeCueGeometry.startY,
                      resumeCueGeometry.controlOneY,
                      resumeCueGeometry.controlTwoY,
                      resumeCueGeometry.endY,
                    ],
                    opacity: [0, 1, 1, 0],
                    scale: [0.4, 1, 0.9, 0.45],
                  }}
                  transition={{ duration: 4.25, times: [0, 0.32, 0.76, 1], ease: 'easeInOut' }}
                />
              </svg>

              <motion.div
                className="absolute rounded-full border border-tertiary/25 bg-surface/76 px-3 py-1.5 text-[10px] font-label uppercase tracking-[0.18em] text-tertiary shadow-xl shadow-tertiary/10 backdrop-blur-sm"
                style={{
                  left: resumeCueGeometry.startX,
                  top: resumeCueGeometry.startY,
                  transform: 'translate(-50%, -50%)',
                }}
                initial={{ opacity: 0, y: 10, filter: 'blur(8px)' }}
                animate={{ opacity: [0, 1, 1, 0], y: [10, 0, 0, -8], filter: ['blur(8px)', 'blur(0px)', 'blur(0px)', 'blur(8px)'] }}
                transition={{ duration: 4.2, times: [0, 0.16, 0.72, 1], ease: 'easeOut' }}
              >
                Resume download
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>


        <SectionShell
          id="hero"
          className="flex min-h-[100svh] flex-col justify-center overflow-hidden px-5 pb-10 pt-24 sm:px-8 lg:px-12 xl:px-16"
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
                Full-stack / ML / interactive systems
              </div>

              <h1 className="text-4xl font-display font-bold leading-[0.96] text-on-surface sm:text-5xl lg:text-6xl xl:text-[4.3rem]">
                {personal.name}
                <span className="mt-3 block bg-gradient-to-r from-tertiary via-primary to-primary-dim bg-clip-text text-transparent">
                  {personal.title}
                </span>
              </h1>

              <p className="mt-6 max-w-2xl text-base leading-7 text-on-surface-variant sm:text-lg sm:leading-8">
                {personal.bio}
              </p>
            </motion.div>

            <motion.div {...reveal} className="relative z-10 mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => document.getElementById('projects')?.scrollIntoView({ behavior: 'smooth' })}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3.5 text-sm font-bold text-on-primary transition hover:bg-primary-dim"
              >
                View projects
                <ArrowRight size={18} />
              </button>
              <a
                ref={resumeButtonRef}
                href={`${import.meta.env.BASE_URL}resume.pdf`}
                className={`relative inline-flex items-center justify-center gap-2 rounded-lg border px-6 py-3.5 text-sm font-semibold transition ${
                  showResumeCue
                    ? 'z-50 border-tertiary/40 bg-surface-container-high text-tertiary shadow-2xl shadow-tertiary/10 ring-1 ring-tertiary/25'
                    : 'border-outline-variant bg-surface-container-high/70 text-on-surface hover:border-tertiary/45 hover:text-tertiary'
                }`}
              >
                <Download size={18} />
                Resume
              </a>
            </motion.div>

            <motion.div {...reveal} className="relative z-10 mt-8 grid max-w-2xl gap-3 sm:grid-cols-3">
              <Metric value={`${projects.length}+`} label="Projects" />
              <Metric value={`${allSkills.length}+`} label="Skills" />
              <Metric value="3" label="Domains" />
            </motion.div>

            <motion.div {...reveal} className="relative z-10 mt-6 flex max-w-2xl flex-wrap gap-2 text-xs font-label uppercase tracking-[0.16em] text-on-surface-variant">
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
                    className="inline-flex items-center gap-2 self-start rounded-lg border border-outline-variant bg-surface-container-high/70 px-5 py-3 text-sm font-semibold text-on-surface transition hover:border-primary/45 hover:text-primary"
                  >
                    <Code2 size={18} />
                    GitHub
                  </a>
                </div>

                <div className="mb-4 flex flex-wrap gap-2">
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

              <div ref={horizontalViewportRef} className="hidden overflow-hidden px-12 xl:px-16 lg:block">
                <div className="mb-3 flex items-center justify-between gap-6">
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

                <div className="mb-3 flex items-center justify-between gap-6 text-[11px] font-label uppercase tracking-[0.18em] text-on-surface-variant">
                  <span>
                    {Math.min(
                      visibleProjects.length,
                      Math.max(1, Math.round(horizontalProgress * visibleProjects.length) || 1),
                    )}
                    /{visibleProjects.length} visible
                  </span>
                  <span>{projectFilter === 'All' ? 'All categories' : projectFilter}</span>
                </div>

                <div ref={horizontalTrackRef} className="horizontal-track flex w-max items-stretch gap-5 py-2">
                  <div className="hidden w-[10vw] min-w-12 flex-none xl:block" aria-hidden="true" />
                  <div className="surface-panel flex h-[var(--project-rail-card-height)] w-[20rem] flex-none flex-col justify-between rounded-xl p-5 xl:w-[21rem]">
                    <div>
                      <p className="text-xs font-label uppercase tracking-[0.22em] text-primary-dim">
                        Overview
                      </p>
                      <h3 className="mt-4 text-xl font-display font-bold leading-tight text-on-surface">
                        Real projects with technical context.
                      </h3>
                    </div>
                    <p className="max-w-sm text-sm leading-6 text-on-surface-variant">
                      Four projects with scope, stack, and implementation notes.
                    </p>
                  </div>

                  {visibleProjects.map((project, index) => (
                    <div key={project.id} className="flex h-[var(--project-rail-card-height)] w-[20rem] flex-none flex-col xl:w-[21rem]">
                      <ProjectCard project={project} index={index} rail onOpenCaseStudy={openCaseStudy} />
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() => document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' })}
                    className="surface-panel group flex h-[var(--project-rail-card-height)] w-[20rem] flex-none flex-col justify-between rounded-xl p-5 text-left transition hover:border-primary/45 xl:w-[21rem]"
                  >
                    <span className="text-xs font-label uppercase tracking-[0.22em] text-primary-dim">Next</span>
                    <span className="text-xl font-display font-bold leading-tight text-on-surface">
                      Continue to profile.
                    </span>
                    <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary text-on-primary transition group-hover:translate-x-2">
                      <ArrowRight size={22} />
                    </span>
                  </button>
                  <div className="hidden w-[18vw] min-w-24 flex-none xl:block" aria-hidden="true" />
                </div>
              </div>

              <div className="grid gap-5 md:grid-cols-2 lg:hidden">
                {visibleProjects.map((project, index) => (
                  <ProjectCard key={project.id} project={project} index={index} onOpenCaseStudy={openCaseStudy} />
                ))}
              </div>
            </div>
          </div>
        </section>

        <SectionShell id="about" className="px-5 py-24 sm:px-8 lg:px-16 lg:py-24">
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

        <SectionShell id="skills" className="px-5 py-24 sm:px-8 lg:px-16 lg:py-24">
          <div className="mx-auto max-w-screen-2xl">
            <SectionHeading
              eyebrow={sectionCopy.skills.eyebrow}
              title={sectionCopy.skills.title}
              copy={sectionCopy.skills.copy}
            />

            <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {skills.map((group, index) => (
                <SkillCard key={group.category} group={group} index={index} />
              ))}
            </div>
          </div>
        </SectionShell>

        <SectionShell id="contact" className="px-5 py-24 sm:px-8 lg:px-16 lg:py-24">
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
