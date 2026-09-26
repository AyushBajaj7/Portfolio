/**
 * @fileoverview Interactive Developer CLI Terminal component.
 * Provides recruiters and developers with an authentic retro-modern CLI experience,
 * interactive command execution, command history, and recruitment easter eggs.
 * @author Ayush Bajaj
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal, X, CornerDownLeft, Sparkles, Check, ExternalLink } from 'lucide-react';
import portfolioData from '../../data/portfolio.json';

interface TerminalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenCaseStudy?: (slug: string) => void;
}

interface CommandHistoryItem {
  id: string;
  command: string;
  output: React.ReactNode;
  timestamp: string;
}

const BANNER_ASCII_DESKTOP = `
  █████╗ ██╗   ██╗██╗   ██╗███████╗██╗  ██╗    ██████╗  █████╗      ██╗ █████╗      ██╗
 ██╔══██╗╚██╗ ██╔╝██║   ██║██╔════╝██║  ██║    ██╔══██╗██╔══██╗     ██║██╔══██╗     ██║
 ███████║ ╚████╔╝ ██║   ██║███████╗███████║    ██████╔╝███████║     ██║███████║     ██║
 ██╔══██║  ╚██╔╝  ██║   ██║╚════██║██╔══██║    ██╔══██╗██╔══██║██   ██║██╔══██║██   ██║
 ██║  ██║   ██║   ╚██████╔╝███████║██║  ██║    ██████╔╝██║  ██║╚█████╔╝██║  ██║╚█████╔╝
 ╚═╝  ╚═╝   ╚═╝    ╚═════╝ ╚══════╝╚═╝  ╚═╝    ╚═════╝ ╚═╝  ╚═╝ ╚════╝ ╚═╝  ╚═╝ ╚════╝ 
`;

const BANNER_ASCII_MOBILE = `
  █████╗ ██╗   ██╗██╗   ██╗███████╗██╗  ██╗
 ██╔══██╗╚██╗ ██╔╝██║   ██║██╔════╝██║  ██║
 ███████║ ╚████╔╝ ██║   ██║███████╗███████║
 ██╔══██║  ╚██╔╝  ██║   ██║╚════██║██╔══██║
 ██║  ██║   ██║   ╚██████╔╝███████║██║  ██║
 ╚═╝  ╚═╝   ╚═╝    ╚═════╝ ╚══════╝╚═╝  ╚═╝
  ██████╗  █████╗      ██╗ █████╗      ██╗
  ██╔══██╗██╔══██╗     ██║██╔══██╗     ██║
  ██████╔╝███████║     ██║███████║     ██║
  ██╔══██╗██╔══██║██   ██║██╔══██║██   ██║
  ██████╔╝██║  ██║╚█████╔╝██║  ██║╚█████╔╝
  ╚═════╝ ╚═╝  ╚═╝ ╚════╝ ╚═╝  ╚═╝ ╚════╝ 
`;

export const TerminalModal: React.FC<TerminalModalProps> = ({ isOpen, onClose, onOpenCaseStudy: _onOpenCaseStudy }) => {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<CommandHistoryItem[]>([]);
  const [commandHistoryIndex, setCommandHistoryIndex] = useState(-1);
  const [pastCommands, setPastCommands] = useState<string[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [isOpen]);

  // Scroll to bottom on new history output
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  // Initialize with welcome message
  useEffect(() => {
    if (isOpen && history.length === 0) {
      setHistory([
        {
          id: 'welcome',
          command: 'init',
          timestamp: new Date().toLocaleTimeString(),
          output: (
            <div className="space-y-2 text-xs leading-5">
              <pre className="hidden sm:block text-primary font-mono text-[9px] sm:text-[11px] leading-tight select-none opacity-90 overflow-x-auto hide-scrollbar">
                {BANNER_ASCII_DESKTOP}
              </pre>
              <pre className="block sm:hidden text-primary font-mono text-[8px] leading-tight select-none opacity-90 overflow-x-auto hide-scrollbar">
                {BANNER_ASCII_MOBILE}
              </pre>
              <div className="text-on-surface-variant pt-1">
                Welcome to Ayush Bajaj's Developer Console v2.6.
              </div>
              <div className="text-on-surface-variant">
                Type <span className="text-tertiary font-bold">help</span> to view available commands or <span className="text-primary font-bold">sudo hire-ayush</span> to evaluate candidate profile.
              </div>
            </div>
          ),
        },
      ]);
    }
  }, [isOpen, history.length]);

  const executeCommand = useCallback(
    (cmdRaw: string) => {
      const trimmed = cmdRaw.trim();
      const cmd = trimmed.toLowerCase();
      const time = new Date().toLocaleTimeString();

      if (!trimmed) return;

      setPastCommands((prev) => [...prev, trimmed]);
      setCommandHistoryIndex(-1);

      let output: React.ReactNode = null;

      switch (cmd) {
        case 'help':
          output = (
            <div className="grid gap-2 text-xs text-on-surface-variant font-mono">
              <p className="text-on-surface font-semibold">Available Commands:</p>
              <div className="grid grid-cols-[140px_1fr] gap-x-2 gap-y-1">
                <span className="text-tertiary">projects</span>
                <span>List featured distributed systems and AI platforms</span>
                <span className="text-tertiary">skills</span>
                <span>View technical strengths and engineering fundamentals</span>
                <span className="text-tertiary">bio</span>
                <span>Display background, experience & mission</span>
                <span className="text-tertiary">contact</span>
                <span>Get direct email, LinkedIn, and GitHub coordinates</span>
                <span className="text-primary font-bold">sudo hire-ayush</span>
                <span className="text-primary">Engage recruitment pipeline & copy contact</span>
                <span className="text-tertiary">clear</span>
                <span>Clear terminal console log</span>
                <span className="text-tertiary">exit</span>
                <span>Close terminal modal</span>
              </div>
            </div>
          );
          break;

        case 'projects':
          output = (
            <div className="space-y-3 text-xs font-mono">
              <div className="text-tertiary font-bold">Featured Production Systems:</div>
              <div className="space-y-2.5">
                {portfolioData.projects.slice(0, 5).map((p, idx) => (
                  <div key={p.id} className="border-l-2 border-primary/30 pl-3 py-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-primary font-bold">0{idx + 1}.</span>
                      <span className="text-on-surface font-semibold">{p.title}</span>
                      <span className="text-[10px] text-tertiary px-1.5 py-0.2 rounded bg-tertiary/10 border border-tertiary/20">
                        {p.category}
                      </span>
                    </div>
                    <div className="text-on-surface-variant text-[11px] mt-0.5">{p.subtitle}</div>
                    <div className="text-[10px] text-on-surface-variant/70 mt-1 flex flex-wrap gap-1.5">
                      {p.tech.map((t) => (
                        <span key={t} className="bg-surface-container-high/60 px-1.5 py-0.5 rounded">
                          {t}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center gap-3 mt-1.5 text-[11px]">
                      <a
                        href={p.link}
                        target="_blank"
                        rel="noreferrer"
                        className="text-tertiary hover:underline inline-flex items-center gap-1"
                      >
                        GitHub <ExternalLink size={10} />
                      </a>
                      {'demo' in p && typeof p.demo === 'string' && (
                        <a
                          href={p.demo}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary hover:underline inline-flex items-center gap-1"
                        >
                          Live Demo <ExternalLink size={10} />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
          break;

        case 'skills':
          output = (
            <div className="space-y-2.5 text-xs font-mono">
              <div className="text-tertiary font-bold">Technical Fundamentals & Stack:</div>
              <div className="grid gap-2">
                {portfolioData.skills.map((s) => (
                  <div key={s.category} className="border border-outline-variant/60 rounded p-2 bg-surface/40">
                    <div className="text-primary font-semibold text-[11px] mb-1">{s.category}</div>
                    <div className="text-on-surface-variant text-[11px] leading-5">
                      {s.items.join(' · ')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
          break;

        case 'bio':
        case 'about':
          output = (
            <div className="space-y-2 text-xs font-mono text-on-surface-variant leading-6">
              <div className="text-primary font-bold">Ayush Bajaj · Systems & AI Engineer</div>
              <p>{portfolioData.personal.bio}</p>
              <p>{portfolioData.personal.about}</p>
              <div className="text-[11px] text-tertiary">Location: {portfolioData.personal.location}</div>
            </div>
          );
          break;

        case 'contact':
          output = (
            <div className="space-y-2 text-xs font-mono">
              <div className="text-tertiary font-bold">Communication Channels:</div>
              <div className="space-y-1.5 text-on-surface-variant">
                <div>
                  Email: <span className="text-primary font-semibold">{portfolioData.personal.email}</span>
                </div>
                <div>
                  GitHub: <a href="https://github.com/AyushBajaj7" target="_blank" rel="noreferrer" className="text-tertiary hover:underline">https://github.com/AyushBajaj7</a>
                </div>
                <div>
                  LinkedIn: <a href="https://www.linkedin.com/in/ayush-bajaj-755517228/" target="_blank" rel="noreferrer" className="text-tertiary hover:underline">linkedin.com/in/ayush-bajaj</a>
                </div>
              </div>
            </div>
          );
          break;

        case 'sudo hire':
        case 'sudo hire-ayush':
        case 'sudo hire ayush':
        case 'sudo hire me':
        case 'hire':
        case 'hire-ayush':
        case 'hire ayush':
        case 'hire me':
          navigator.clipboard?.writeText(portfolioData.personal.email);
          output = (
            <div className="space-y-2 text-xs font-mono border-2 border-primary/50 bg-primary/10 rounded-lg p-3.5 shadow-lg shadow-primary/10">
              <div className="flex items-center gap-2 text-primary font-bold text-sm">
                <Sparkles size={16} className="text-primary animate-spin" />
                OFFER PIPELINE ENGAGED · CANDIDATE READY
              </div>
              <div className="text-on-surface leading-5">
                Ayush Bajaj brings deep expertise in distributed backend systems, AST impact analysis, and applied multimodal AI.
              </div>
              <div className="flex items-center gap-2 text-primary-dim bg-surface/80 px-2.5 py-1.5 rounded border border-primary/30 text-[11px]">
                <Check size={14} className="text-primary" />
                <span>Primary Email ({portfolioData.personal.email}) copied to clipboard!</span>
              </div>
              <div className="pt-1 flex gap-2">
                <a
                  href={`mailto:${portfolioData.personal.email}?subject=Interview%20Invitation%20-%20Software%20Engineer`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-primary text-on-primary font-bold text-[11px] hover:bg-primary-dim transition"
                >
                  Send Email Invite
                </a>
                <a
                  href={`${import.meta.env.BASE_URL}resume.pdf`}
                  download
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-primary/40 bg-surface text-primary font-semibold text-[11px] hover:bg-primary/10 transition"
                >
                  Download Resume
                </a>
              </div>
            </div>
          );
          break;

        case 'clear':
          setHistory([]);
          setInput('');
          return;

        case 'exit':
        case 'quit':
          onClose();
          setInput('');
          return;

        default:
          output = (
            <div className="text-xs font-mono text-rose-400">
              Command not recognized: <span className="font-bold">{trimmed}</span>. Type <span className="text-tertiary underline cursor-pointer" onClick={() => executeCommand('help')}>help</span> for valid options.
            </div>
          );
          break;
      }

      setHistory((prev) => [
        ...prev,
        {
          id: `${Date.now()}-${Math.random()}`,
          command: trimmed,
          timestamp: time,
          output,
        },
      ]);
      setInput('');
    },
    [onClose]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      executeCommand(input);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (pastCommands.length > 0) {
        const nextIdx = commandHistoryIndex === -1 ? pastCommands.length - 1 : Math.max(0, commandHistoryIndex - 1);
        setCommandHistoryIndex(nextIdx);
        setInput(pastCommands[nextIdx]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (commandHistoryIndex !== -1) {
        const nextIdx = commandHistoryIndex + 1;
        if (nextIdx < pastCommands.length) {
          setCommandHistoryIndex(nextIdx);
          setInput(pastCommands[nextIdx]);
        } else {
          setCommandHistoryIndex(-1);
          setInput('');
        }
      }
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
          {/* Backdrop blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-background/80 backdrop-blur-md"
          />

          {/* Terminal Window */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 w-full max-w-3xl h-[80vh] max-h-[640px] rounded-2xl terminal-window flex flex-col overflow-hidden border border-tertiary/30 shadow-2xl"
          >
            {/* Scanline CRT overlay */}
            <div className="terminal-scanline absolute inset-0 z-0 pointer-events-none opacity-40" />

            {/* Window Title Bar */}
            <div className="relative z-10 flex items-center justify-between px-4 py-3 border-b border-outline-strong bg-surface-highest/80 select-none">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="h-3 w-3 rounded-full bg-rose-500/80 hover:bg-rose-400 transition cursor-pointer"
                  title="Close Terminal"
                />
                <div className="h-3 w-3 rounded-full bg-amber-500/80 hover:bg-amber-400 transition" />
                <div className="h-3 w-3 rounded-full bg-emerald-500/80 hover:bg-emerald-400 transition" />
                <div className="ml-3 flex items-center gap-2 text-xs font-mono text-on-surface-variant font-medium">
                  <Terminal size={14} className="text-tertiary" />
                  <span>ayush@portfolio: ~</span>
                  <span className="hidden sm:inline-block text-[10px] text-primary/70 bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20">
                    zsh interactive
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => executeCommand('sudo hire-ayush')}
                  className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-primary/40 bg-primary/10 text-[11px] font-mono font-semibold text-primary hover:bg-primary/20 transition cursor-pointer"
                >
                  <Sparkles size={12} />
                  sudo hire-ayush
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition"
                  aria-label="Close"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Terminal Body */}
            <div
              onClick={() => inputRef.current?.focus()}
              className="relative z-10 flex-1 overflow-y-auto terminal-scroll p-4 sm:p-5 font-mono space-y-4 cursor-text"
            >
              {history.map((item) => (
                <div key={item.id} className="space-y-1.5">
                  <div className="flex items-center gap-2 text-xs text-on-surface-variant">
                    <span className="text-primary font-bold">ayush@dev:~$</span>
                    <span className="text-on-surface font-semibold">{item.command}</span>
                    <span className="text-[10px] opacity-40 ml-auto">{item.timestamp}</span>
                  </div>
                  <div className="pl-4">{item.output}</div>
                </div>
              ))}

              {/* Active prompt row */}
              <div className="flex items-center gap-2 text-xs pt-1">
                <span className="text-primary font-bold">ayush@dev:~$</span>
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="flex-1 bg-transparent text-on-surface focus:outline-none font-mono text-xs caret-primary"
                  placeholder="Type 'help' or 'sudo hire'..."
                  autoComplete="off"
                  spellCheck={false}
                />
                <button
                  type="button"
                  onClick={() => executeCommand(input)}
                  className="text-on-surface-variant/60 hover:text-primary p-1 cursor-pointer"
                >
                  <CornerDownLeft size={13} />
                </button>
              </div>

              <div ref={bottomRef} />
            </div>

            {/* Footer quick suggestions */}
            <div className="relative z-10 px-4 py-2 border-t border-outline-variant bg-surface/70 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-on-surface-variant">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-on-surface-variant/70">Suggestions:</span>
                {['projects', 'skills', 'bio', 'contact', 'sudo hire'].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => executeCommand(s)}
                    className="px-2 py-0.5 rounded bg-surface-container-high hover:bg-surface-highest hover:text-primary transition cursor-pointer"
                  >
                    {s}
                  </button>
                ))}
              </div>
              <span className="text-[10px] text-on-surface-variant/60 hidden sm:inline">
                Press ESC or type 'exit' to close
              </span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default TerminalModal;
