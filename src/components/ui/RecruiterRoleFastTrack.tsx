import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Server,
  Sparkles,
  Code2,
  Check,
  Copy,
  Mail,
  Zap,
  ChevronDown,
} from 'lucide-react';

export interface RecruiterRole {
  id: string;
  label: string;
  shortLabel: string;
  icon: React.FC<{ size?: number; className?: string }>;
  tagline: string;
  matchedSkills: string[];
  recommendedProjectSlugs: string[];
  pitch: string;
}

export const RECRUITER_ROLES: RecruiterRole[] = [
  {
    id: 'backend',
    label: 'Distributed & Backend Systems',
    shortLabel: 'Backend & Systems',
    icon: Server,
    tagline: 'Microservices, graph architectures, AST parsing, high-throughput APIs, and Dockerized cloud pipelines.',
    matchedSkills: ['Go', 'Java', 'Python', 'FastAPI', 'Spring Boot', 'Neo4j', 'Redis', 'Docker', 'PostgreSQL', 'Microservices', 'Distributed Systems'],
    recommendedProjectSlugs: ['microservice-drift-tracker-mdt', 'luxon', 'agriconnect', 'weathervision'],
    pitch:
      'Ayush Bajaj is a Backend & Distributed Systems Engineer specializing in Go, Java/Spring Boot, Python/FastAPI, Neo4j graph databases, and microservices architecture. Flagship work includes MDT (Microservice Dependency Tracker) with AST diff parsing and automated blast-radius risk scoring.',
  },
  {
    id: 'ai',
    label: 'Applied AI & Machine Learning',
    shortLabel: 'Applied AI & ML',
    icon: Sparkles,
    tagline: 'LLM orchestration, RAG pipelines, ChromaDB vector search, AST drift inference, and multimodal systems.',
    matchedSkills: ['Python', 'ChromaDB', 'RAG Pipelines', 'Gemini API', 'PyTorch', 'Scikit-learn', 'FLAN-T5', 'AST Analysis', 'Machine Learning'],
    recommendedProjectSlugs: ['microservice-drift-tracker-mdt', 'cat-x', 'document-summary-assistant', 'ai-ppt-explainer', 'disease-prediction'],
    pitch:
      'Ayush Bajaj is an Applied AI Engineer with deep experience in LLM orchestration, RAG pipelines with ChromaDB, AST semantic drift analysis, and predictive models. Experience includes the Caterpillar Hackathon Cat-X twin engine and multimodal document intelligence.',
  },
  {
    id: 'fullstack',
    label: 'Full-Stack & Product Engineering',
    shortLabel: 'Full-Stack & Web',
    icon: Code2,
    tagline: 'Production React, Next.js, TypeScript, Tailwind CSS, Canvas 2D/3D physics, and high-performance APIs.',
    matchedSkills: ['React', 'Next.js', 'TypeScript', 'Tailwind CSS', 'Node.js', 'Canvas API', 'REST & gRPC APIs', 'State Management'],
    recommendedProjectSlugs: ['document-summary-assistant', 'luxon', 'agriconnect', 'weathervision'],
    pitch:
      'Ayush Bajaj is a Full-Stack Engineer with strong production experience across React, Next.js, TypeScript, and Tailwind CSS, coupled with high-performance Python/Node backend services, real-time WebSockets, and custom Canvas 2D/3D systems.',
  },
];

interface RecruiterRoleFastTrackProps {
  activeRoleId: string | null;
  onSelectRole: (roleId: string | null) => void;
  onScrollToContact: () => void;
}

export const RecruiterRoleFastTrack: React.FC<RecruiterRoleFastTrackProps> = ({
  activeRoleId,
  onSelectRole,
  onScrollToContact,
}) => {
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const activeRole = RECRUITER_ROLES.find((r) => r.id === activeRoleId) || null;

  const handleCopyPitch = () => {
    if (!activeRole) return;
    navigator.clipboard?.writeText(activeRole.pitch);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="surface-panel rounded-2xl border border-primary/25 bg-surface-container-low/70 p-4 sm:p-5 mb-8 backdrop-blur-md">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <Zap size={15} />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
                Recruiter Fast-Track
              </span>
              <span className="rounded-full bg-primary/10 border border-primary/30 px-2 py-0.2 text-[9px] font-mono text-primary font-semibold">
                1-CLICK ROLE FILTER
              </span>
            </div>
            <p className="text-xs text-on-surface-variant font-mono">
              Match Ayush's projects & skills against your team's open hiring vacancy
            </p>
          </div>
        </div>

        {activeRole && (
          <button
            type="button"
            onClick={() => onSelectRole(null)}
            className="text-xs text-on-surface-variant hover:text-primary transition underline font-mono cursor-pointer"
          >
            Clear role filter
          </button>
        )}
      </div>

      {/* Role Selection Buttons */}
      <div className="mt-3.5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onSelectRole(null)}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer border ${
            activeRoleId === null
              ? 'bg-primary text-on-primary border-primary shadow-sm shadow-primary/20'
              : 'border-outline-variant bg-surface-container-high/60 text-on-surface-variant hover:border-primary/40 hover:text-on-surface'
          }`}
        >
          All Roles
        </button>

        {RECRUITER_ROLES.map((role) => {
          const isSelected = activeRoleId === role.id;
          const Icon = role.icon;
          return (
            <button
              key={role.id}
              type="button"
              onClick={() => onSelectRole(role.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer border ${
                isSelected
                  ? 'bg-primary text-on-primary border-primary shadow-md shadow-primary/25'
                  : 'border-outline-variant bg-surface-container-high/60 text-on-surface-variant hover:border-primary/40 hover:text-on-surface'
              }`}
            >
              <Icon size={14} className={isSelected ? 'text-on-primary' : 'text-primary'} />
              <span>{role.shortLabel}</span>
            </button>
          );
        })}
      </div>

      {/* Role Match Detail Drawer */}
      <AnimatePresence>
        {activeRole && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="mt-4 pt-4 border-t border-outline-variant/60 space-y-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-on-surface">Target Alignment:</span>
                <span className="rounded bg-primary/15 text-primary border border-primary/30 px-2 py-0.5 text-xs font-bold">
                  {activeRole.label}
                </span>
              </div>
              <span className="text-xs text-primary-dim font-mono">
                ✓ Auto-filtered relevant projects & key tech stack
              </span>
            </div>

            <p className="text-xs sm:text-sm text-on-surface-variant leading-6">
              {activeRole.tagline}
            </p>

            {/* Quick Skills Pill Matched */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[10px] uppercase tracking-wider text-on-surface-variant/70 font-mono mr-1">
                Matched Core Stack:
              </span>
              {activeRole.matchedSkills.map((sk) => (
                <span
                  key={sk}
                  className="rounded-full bg-surface-container-high border border-primary/30 px-2.5 py-0.5 text-[10px] font-mono text-primary font-semibold"
                >
                  {sk}
                </span>
              ))}
            </div>

            {/* Recruiter Action Bar: Copy Pitch & Contact */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyPitch}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-primary/40 bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition cursor-pointer"
                >
                  {copied ? <Check size={14} className="text-primary" /> : <Copy size={14} />}
                  <span>{copied ? 'Pitch Copied to Clipboard!' : 'Copy Tailored Pitch for Hiring Manager'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="p-1.5 rounded-lg border border-outline-variant text-on-surface-variant hover:text-on-surface text-xs inline-flex items-center gap-1"
                >
                  <span className="text-[11px]">{isExpanded ? 'Hide Pitch' : 'Preview Pitch'}</span>
                  <ChevronDown size={13} className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                </button>
              </div>

              <button
                type="button"
                onClick={onScrollToContact}
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-semibold cursor-pointer"
              >
                <Mail size={13} /> Contact Ayush for this Role →
              </button>
            </div>

            {/* Expandable pitch preview */}
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-outline-variant/60 bg-surface/80 p-3 text-xs font-mono text-on-surface-variant leading-5"
              >
                <div className="text-[10px] uppercase tracking-wider text-primary font-bold mb-1">
                  1-Click Hiring Manager Summary:
                </div>
                "{activeRole.pitch}"
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
