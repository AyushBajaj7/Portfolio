/**
 * @fileoverview SectionGroup component - Main content sections for the portfolio.
 * Handles hero, projects (with horizontal scroll on desktop), about, skills, and contact sections.
 * Implements scroll-driven animations, project filtering, and responsive layouts.
 * @author Ayush Bajaj
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useInView, useReducedMotion } from 'framer-motion';
import {
  ArrowRight,
  Check,
  Code2,
  Copy,
  Download,
  FileText,
  ExternalLink,
  Layers3,
  Send,
  MapPin,
  X,
  Server,
  Sparkles,
  Calendar,
  Zap,
  Terminal,
  Cpu,
  ChevronDown,
} from 'lucide-react';
import portfolioData from '../../data/portfolio.json';
import { useStore } from '../../store/useStore';
import { TerminalModal } from './TerminalModal';
import { TiltCard } from './TiltCard';
import { BlastRadiusSimulator } from './BlastRadiusSimulator';
import { CatXTelemetryWidget } from './CatXTelemetryWidget';

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
const PROGRESS_UPDATE_THRESHOLD = 0.00075;

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
    eyebrow: 'Work',
    title: 'From signal to decision',
    copy: 'Follow a code change through a service graph, then explore how operator signals become a safety decision.',
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
  'Distributed & Backend Systems': 'Microservices, graph and vector databases, and real-time APIs.',
  'Applied AI & Machine Learning': 'LLM orchestration, RAG pipelines, AST analysis, and model evaluation.',
  'Frontend Engineering':          'Responsive interfaces, component systems, and interaction states.',
  'Cloud & DevOps':                'Containerized deployments, media pipelines, and automated workflows.',
  'Engineering Foundations':       'Distributed systems design, algorithms, and deep technical problem solving.',
  'Backend Systems':               'API design, application logic, and structured data handling.',
  'Applied AI':                    'Model workflows, evaluation, and production-minded ML usage.',
  'Deployment & Media':            'Cloud delivery, media processing, and 3D asset workflows.',
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

const getImplementationFocus = (project: Project) => {
  const s = `${project.title} ${project.subtitle} ${project.tech.join(' ')}`.toLowerCase();
  if (s.includes('mdt') || s.includes('drift') || s.includes('microservice')) return 'Cross-service blast-radius & graph engine';
  if (s.includes('cat-x') || s.includes('trajectory') || s.includes('twin')) return 'Telemetry and trajectory simulation';
  if (s.includes('ppt') || s.includes('avatar') || s.includes('wav2lip') || s.includes('flan')) return 'Deep Learning Lip-Sync & Media Pipeline';
  if (s.includes('luxon') || s.includes('razorpay') || s.includes('flask')) return 'Transactional flows and SQL aggregation';
  if (s.includes('disease') || s.includes('microarray') || s.includes('scikit')) return 'Gene expression classifier & cross-validation';
  if (s.includes('weather') || s.includes('vision') || s.includes('atmospheric')) return 'Zero-dependency telemetry proxy & AQI engine';
  if (s.includes('agriconnect') || s.includes('express') || s.includes('mongo')) return 'Centralized agricultural data schema';
  if (s.includes('3d') || s.includes('unity') || s.includes('opengl')) return 'Real-time 3D walkthrough & rendering loop';
  if (s.includes('summary') || s.includes('gemini') || s.includes('document')) return 'Multimodal extraction & LLM summarization';
  return 'Implementation snapshot';
};

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
}> = ({ id, children, className = '' }) => {
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, { margin: '-20% 0px -40% 0px' });
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

// ─── BentoGridView: High-Density Recruiter Matrix ────────────────────────────

const BentoGridView: React.FC<{
  projects: Project[];
  onOpenCaseStudy: (project: Project) => void;
}> = React.memo(({ projects, onOpenCaseStudy }) => {
  if (projects.length === 0) {
    return (
      <div className="surface-panel rounded-2xl p-10 text-center text-on-surface-variant">
        No projects match the selected filter.
      </div>
    );
  }

  const heroProject = projects[0];
  const companionProject = projects.length > 1 ? projects[1] : null;
  const secondaryProjects = projects.slice(2, 5);
  const remainingProjects = projects.slice(5);

  return (
    <div className="bento-grid">
      {/* TILE 1: Top Ranked Project (Hero 8-cols on desktop, 12 on tablet) */}
      <motion.div
        {...reveal}
        className={`col-span-12 ${companionProject ? 'lg:col-span-8' : 'lg:col-span-12'} flex flex-col`}
      >
        <TiltCard
          className="h-full surface-panel shimmer-card group rounded-2xl p-6 sm:p-7 border border-outline-variant hover:border-primary/40 transition-all duration-200 flex flex-col justify-between"
        >
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-primary/15 border border-primary/40 px-3 py-1 text-[11px] font-label font-bold uppercase tracking-[0.2em] text-primary">
                  ★ 01 · FEATURED PROJECT
                </span>
                <span className="rounded-full border border-tertiary/30 bg-tertiary/10 px-2.5 py-0.5 text-[10px] font-label uppercase tracking-[0.16em] text-tertiary">
                  {heroProject.category}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-on-surface-variant font-mono">
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

            {/* Give the lead Cat-X story its telemetry interaction; retain MDT's simulator on its case study. */}
            {heroProject.id === 2 ? (
              <div className="mt-5">
                <CatXTelemetryWidget />
              </div>
            ) : heroProject.id === 1 ? (
              <div className="mt-5">
                <BlastRadiusSimulator onExploreMore={() => onOpenCaseStudy(heroProject)} />
              </div>
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
            <div className="flex items-center gap-3">
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
                onClick={() => onOpenCaseStudy(heroProject)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold hover:bg-primary-dim transition cursor-pointer"
              >
                Interactive Case Study <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </TiltCard>
      </motion.div>

      {/* TILE 2: Companion Project (4-cols on desktop, 12 or 6 on tablet) */}
      {companionProject && (
        <motion.div
          {...reveal}
          className="col-span-12 md:col-span-12 lg:col-span-4 flex flex-col"
        >
          <TiltCard
            className="h-full surface-panel shimmer-card group rounded-2xl p-6 border border-outline-variant hover:border-tertiary/40 transition-all duration-200 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="rounded-full bg-tertiary/15 border border-tertiary/40 px-2.5 py-0.5 text-[10px] font-label font-bold uppercase tracking-[0.18em] text-tertiary">
                  ★ 02 · {companionProject.category}
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

              {/* In-Cab Digital Twin Telemetry & Consequence Simulator */}
              {companionProject.id === 2 && <CatXTelemetryWidget />}
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
                  onClick={() => onOpenCaseStudy(companionProject)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-on-surface hover:text-tertiary transition cursor-pointer"
                >
                  Explore <ArrowRight size={13} />
                </button>
              </div>
            </div>
          </TiltCard>
        </motion.div>
      )}

      {/* SECONDARY ROW (3 tiles: 4-cols each on desktop, 6-cols on tablet) */}
      {secondaryProjects.map((p, idx) => (
        <motion.div
          key={p.id}
          {...revealFast}
          className="col-span-12 md:col-span-6 lg:col-span-4 flex flex-col"
        >
          <TiltCard
            className="h-full surface-panel shimmer-card group rounded-2xl p-5 border border-outline-variant hover:border-primary/30 transition flex flex-col justify-between"
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
              <h4 className="text-lg font-display font-bold text-on-surface group-hover:text-primary transition-colors">
                {p.title}
              </h4>
              <p className="mt-2 text-xs leading-5 text-on-surface-variant line-clamp-3">
                {p.description}
              </p>
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
                onClick={() => onOpenCaseStudy(p)}
                className="text-on-surface-variant hover:text-primary flex items-center gap-1 font-semibold ml-auto transition cursor-pointer"
              >
                Case Study <ArrowRight size={12} />
              </button>
            </div>
          </TiltCard>
        </motion.div>
      ))}

      {/* TERTIARY ROW (Remaining projects: 3-cols each on desktop, 6-cols on tablet) */}
      {remainingProjects.map((p, idx) => (
        <motion.div
          key={p.id}
          {...revealFast}
          className="col-span-12 md:col-span-6 lg:col-span-4 flex flex-col"
        >
          <TiltCard
            className="h-full surface-panel-subtle shimmer-card group rounded-2xl p-4 border border-outline-variant hover:border-primary/30 transition flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[9px] font-label uppercase tracking-wider text-primary-dim">{String(idx + 6).padStart(2, '0')} · {p.category}</span>
              </div>
              <h5 className="text-sm font-display font-bold text-on-surface group-hover:text-primary transition-colors line-clamp-1">
                {p.title}
              </h5>
              <p className="mt-1 text-[11px] leading-4 text-on-surface-variant line-clamp-2">
                {p.description}
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-outline-variant/60 flex items-center justify-between text-[11px]">
              <span className="text-on-surface-variant font-mono text-[10px]">
                {p.tech.slice(0, 2).join(' · ')}
              </span>
              <button
                type="button"
                onClick={() => onOpenCaseStudy(p)}
                className="text-primary font-semibold hover:text-primary-dim flex items-center gap-1 transition cursor-pointer"
              >
                Details <ArrowRight size={10} />
              </button>
            </div>
          </TiltCard>
        </motion.div>
      ))}
    </div>
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
  const [isEmailChooserOpen, setIsEmailChooserOpen] = useState(false);
  const [status, setStatus] = useState('This opens your email app; the site never sends a message without your review.');
  const [draft, setDraft] = useState({ name: '', replyTo: '', subject: '', message: '' });

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

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsEmailChooserOpen(true);
    setStatus('Choose where you want to prepare this message.');
  };

  const writeClipboard = async (value: string) => {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return;
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
      setStatus('Email address copied.');
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setStatus('Copy is unavailable here. Select the email address above to copy it.');
    }
  };

  return (
    <div className="space-y-4">
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
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-on-primary transition hover:bg-primary-dim focus-visible:outline-offset-2"
          >
            <Send size={16} /> Choose email app
          </button>
          <button
            type="button"
            onClick={async () => {
              try {
                await writeClipboard(`To: ${email}\nSubject: ${draft.subject || 'Portfolio enquiry'}\n\n${draft.message}\n\nName: ${draft.name}\nReply to: ${draft.replyTo}`);
                setStatus('Message draft copied.');
              } catch {
                setStatus('Copy is unavailable in this browser.');
              }
            }}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-outline-variant bg-surface-container-high px-4 py-2.5 text-sm font-semibold text-on-surface transition hover:border-primary/40 hover:text-primary"
          >
            <Copy size={16} /> Copy draft
          </button>
        </div>
        {isEmailChooserOpen && (
          <div className="rounded-xl border border-primary/25 bg-primary/5 p-3" role="group" aria-label="Choose email app">
            <p className="mb-2.5 text-xs font-semibold text-on-surface">Open this draft in:</p>
            <div className="grid gap-2 sm:grid-cols-3">
              <a
                href={getGmailUrl()}
                target="_blank"
                rel="noreferrer"
                onClick={() => setStatus('Gmail opened in a new browser tab with your draft.')}
                className="inline-flex min-h-10 items-center justify-center rounded-lg border border-outline-variant bg-surface-container-high px-3 py-2 text-xs font-semibold text-on-surface transition hover:border-primary/40 hover:text-primary"
              >
                Gmail
              </a>
              <a
                href={getOutlookUrl()}
                target="_blank"
                rel="noreferrer"
                onClick={() => setStatus('Outlook on the web opened in a new browser tab with your draft.')}
                className="inline-flex min-h-10 items-center justify-center rounded-lg border border-outline-variant bg-surface-container-high px-3 py-2 text-xs font-semibold text-on-surface transition hover:border-primary/40 hover:text-primary"
              >
                Outlook on the web
              </a>
              <a
                href={getMailtoUrl()}
                onClick={() => setStatus('Your device will use its configured default email app.')}
                className="inline-flex min-h-10 items-center justify-center rounded-lg border border-outline-variant bg-surface-container-high px-3 py-2 text-xs font-semibold text-on-surface transition hover:border-primary/40 hover:text-primary"
              >
                Default email app
              </a>
            </div>
          </div>
        )}
        <p role="status" aria-live="polite" className="text-xs leading-5 text-on-surface-variant">{status}</p>
      </form>

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
  const lines = useMemo(() => project.codePreview ? getCodePreviewLines(project.codePreview, 8) : [], [project.codePreview]);
  const notes = useMemo(() => getProjectScopeNotes(project), [project]);
  const demo = useMemo(() => getProjectDemo(project), [project]);
  const story = 'story' in project ? project.story : null;

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
        className="case-study-dialog bg-surface/98 backdrop-blur-2xl border border-outline-variant max-h-[min(90dvh,820px)] w-full max-w-5xl overflow-y-auto rounded-2xl shadow-2xl"
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
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
  const reduceMotion = useReducedMotion();
  const overlayRef = useRef<HTMLDivElement>(null);
  const resumeButtonRef = useRef<HTMLAnchorElement>(null);
  const lastScrollProgressRef = useRef(0);

  const setScrollProgress = useStore((s) => s.setScrollProgress);

  const [projectFilter, setProjectFilter] = useState('All');
  const [showResumeCue, setShowResumeCue] = useState(false);
  const [resumeCueGeometry, setResumeCueGeometry] = useState<ResumeCueGeometry | null>(null);
  const [activeProjectSlug, setActiveProjectSlug] = useState<string | null>(null);
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);

  // Global shortcut (tilde/backtick) to toggle Developer CLI Terminal
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '`' || e.key === '~') {
        const activeElem = document.activeElement;
        if (activeElem && ['INPUT', 'TEXTAREA'].includes(activeElem.tagName)) return;
        e.preventDefault();
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
    const measureCue = () => {
      const btn = resumeButtonRef.current;
      if (!btn) return;
      const rect = btn.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
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
      measureCue();
      if (resumeButtonRef.current?.getBoundingClientRect().width) setShowResumeCue(true);
    }, 700);
    const hideTimer = window.setTimeout(() => setShowResumeCue(false), 3600);
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
    if (!activeProject) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeCaseStudy(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeProject, closeCaseStudy]);

  // Main scroll handler - pure layout reads from window.scrollY, zero forced reflows
  const updateScrollState = useCallback(() => {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const scrollHeight = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const progress = Math.min(1, Math.max(0, scrollTop / scrollHeight));

    if (Math.abs(progress - lastScrollProgressRef.current) > PROGRESS_UPDATE_THRESHOLD) {
      lastScrollProgressRef.current = progress;
      setScrollProgress(progress);
    }
  }, [setScrollProgress]);

  // Scroll event binding for native window scroll
  useEffect(() => {
    let frame = 0;
    let scheduled = false;

    const scheduleUpdate = () => {
      if (!scheduled) {
        scheduled = true;
        frame = window.requestAnimationFrame(() => {
          scheduled = false;
          updateScrollState();
        });
      }
    };

    updateScrollState();
    window.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('resize', scheduleUpdate, { passive: true });

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('scroll', scheduleUpdate);
      window.removeEventListener('resize', scheduleUpdate);
    };
  }, [updateScrollState]);

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div ref={overlayRef} id="scroll-container" className="ui-overlay">
      {/* Background grid */}
      <div
        className="fixed inset-0 z-0 pointer-events-none cyber-grid"
        style={{ contain: 'strict' }}
        aria-hidden="true"
      />

      <main className="relative z-10">
        <AnimatePresence>
          {activeProject && (
            <ProjectCaseStudy key={`cs-${activeProject.id}`} project={activeProject} onClose={closeCaseStudy} reduceMotion={Boolean(reduceMotion)} />
          )}

          {/* Elegant Localized Resume Cue */}
          {showResumeCue && resumeCueGeometry && (
            <motion.div
              key="resume-cue"
              data-resume-cue
              className="pointer-events-none fixed inset-0 z-40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
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
            <motion.div {...reveal} className="max-w-xl md:max-w-[440px] lg:max-w-[500px] xl:max-w-3xl relative z-10">
                {/* Availability and role focus */}
              <div className="mb-6 flex flex-wrap items-center gap-2.5">
                <div className="inline-flex items-center gap-2.5 rounded-full border border-primary/30 bg-primary/8 px-4 py-2 text-[11px] font-label font-bold uppercase tracking-[0.20em] text-primary shadow-sm shadow-primary/10">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary" />
                  </span>
                  Available for software roles
                </div>

                <span className="inline-flex items-center gap-2 px-1 text-[10px] font-label font-semibold uppercase tracking-[0.19em] text-on-surface-variant">
                  Backend systems <span className="text-primary">/</span> Applied AI
                </span>

              </div>

              <p className="mb-3 text-xs font-label font-semibold uppercase tracking-[0.23em] text-on-surface-variant">{personal.name} · {personal.title}</p>
              <h1 className="max-w-3xl text-[2.65rem] font-display font-bold leading-[0.98] tracking-[-0.045em] text-on-surface sm:text-6xl lg:text-7xl xl:text-[5.4rem]">
                Turn complex signals into <span
                  className="bg-clip-text text-transparent"
                  style={{ backgroundImage: 'linear-gradient(120deg, var(--title-gradient-from), var(--title-gradient-via), var(--title-gradient-to))' }}
                >clear decisions.</span>
              </h1>

              <p className="mt-6 max-w-2xl text-base leading-7 text-on-surface-variant sm:text-lg sm:leading-8">
                {personal.bio}
              </p>
            </motion.div>

            {/* CTAs */}
            <motion.div {...reveal} className="relative z-10 mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => scrollToSection('projects')}
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
              <a
                href={personal.resumeLink}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-sm font-semibold text-on-surface-variant transition hover:text-primary"
              >
                Drive copy <ExternalLink size={15} />
              </a>
            </motion.div>

            {/* Interactive Scroll-Down Cue */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9, duration: 0.6 }}
              className="relative z-10 mt-10 hidden sm:flex items-center gap-3 text-[11px] font-label uppercase tracking-[0.22em] text-on-surface-variant/75"
            >
              <button
                type="button"
                onClick={() => scrollToSection('projects')}
                className="inline-flex items-center gap-2.5 transition hover:text-primary cursor-pointer group"
                aria-label="Scroll to Projects"
              >
                <div className="flex h-7 w-4.5 items-start justify-center rounded-full border border-outline-variant group-hover:border-primary/50 transition p-1">
                  <motion.div
                    animate={reduceMotion ? { y: 0 } : { y: [0, 5, 0] }}
                    transition={reduceMotion ? { duration: 0 } : { duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
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
          className="px-5 py-20 sm:px-8 lg:px-12 xl:px-16"
        >
          <div className="mx-auto w-full min-w-0 max-w-screen-2xl">
            <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <SectionHeading
                eyebrow={sectionCopy.projects.eyebrow}
                title={sectionCopy.projects.title}
                copy={sectionCopy.projects.copy}
              />
              <div className="flex flex-wrap items-center gap-3 self-start lg:self-end">
                <a
                  href="https://github.com/AyushBajaj7"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl border border-outline-variant bg-surface-container-high/65 px-5 py-2.5 text-sm font-semibold text-on-surface transition hover:border-primary/40 hover:text-primary"
                >
                  <Code2 size={16} />
                  GitHub
                </a>
              </div>
            </div>

            {/* Filter projects by their main discipline */}
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap gap-2">
                {projectFilters.map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => setProjectFilter(filter)}
                    className={`rounded-xl border px-4 py-2 text-sm font-semibold transition cursor-pointer ${
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

            <BentoGridView projects={visibleProjects} onOpenCaseStudy={openCaseStudy} />
          </div>
        </SectionShell>

        {/* ── ABOUT ────────────────────────────────────────────────────── */}
        <SectionShell id="about" className="px-5 py-24 sm:px-8 lg:px-16 lg:py-28">
          <div className="mr-auto max-w-xl md:max-w-[440px] lg:max-w-4xl grid gap-8 sm:gap-10 lg:grid-cols-2 lg:items-start">
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

              {/* The problem spaces I build for */}
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
          <div className="mr-auto max-w-xl md:max-w-[440px] lg:max-w-[500px] xl:max-w-2xl grid gap-8 sm:gap-10">
            <div className="max-w-[240px] sm:max-w-none">
              <SectionHeading
                eyebrow={sectionCopy.contact.eyebrow}
                title={sectionCopy.contact.title}
                copy={sectionCopy.contact.copy}
              />
            </div>

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
            onClick={() => setIsTerminalOpen(true)}
            className="inline-flex items-center gap-2 rounded-full border border-tertiary/40 bg-surface/90 backdrop-blur-md px-3.5 py-2 sm:px-4 sm:py-2.5 text-xs font-mono font-semibold text-on-surface shadow-2xl hover:border-tertiary hover:text-tertiary hover:shadow-tertiary/20 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer"
            aria-label="Open Developer CLI Terminal"
          >
            <span className="relative flex h-2 w-2">
              <span className="relative inline-flex rounded-full h-2 w-2 bg-tertiary" />
            </span>
            <Terminal size={14} className="text-tertiary" />
            <span>CLI Terminal</span>
            <span className="hidden sm:inline text-[9px] text-tertiary/80 bg-tertiary/10 px-1.5 py-0.5 rounded border border-tertiary/20">
              ~
            </span>
          </button>
        </div>
      )}

      {/* Developer CLI Terminal Modal */}
      <TerminalModal
        isOpen={isTerminalOpen}
        onClose={() => setIsTerminalOpen(false)}
        onOpenCaseStudy={openCaseStudyFromTerminal}
      />
    </div>
  );
};
