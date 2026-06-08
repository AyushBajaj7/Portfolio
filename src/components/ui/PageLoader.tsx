/**
 * @fileoverview PageLoader component - Branded loading animation with progress indicator.
 * Shows on initial page load with Ayush Bajaj branding.
 * @author Ayush Bajaj
 */

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export const PageLoader: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const t1 = window.setTimeout(() => setProgress(100), reduced ? 0 : 100);
    const t2 = window.setTimeout(() => setIsLoading(false), reduced ? 60 : 480);
    return () => { window.clearTimeout(t1); window.clearTimeout(t2); };
  }, []);

  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
          style={{ background: 'var(--bg, #07070d)' }}
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, filter: 'blur(4px)' }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
        >
          {/* Subtle radial glow behind the wordmark */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background: 'radial-gradient(ellipse 420px 260px at 50% 50%, rgba(156,255,147,0.055) 0%, transparent 70%)',
            }}
            aria-hidden="true"
          />

          <motion.div
            className="relative flex flex-col items-center"
            initial={{ scale: 0.88, opacity: 0, y: 8 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Wordmark */}
            <h1 className="text-5xl sm:text-6xl font-display font-bold tracking-tight"
              style={{ color: 'var(--on-surface, #eaeaee)' }}>
              Ayush<span style={{ color: 'var(--primary-dim, #00ec3b)' }}>.</span>
            </h1>

            {/* Animated underline sweep */}
            <motion.div
              className="mt-2 h-[1.5px] rounded-full"
              style={{ background: 'linear-gradient(90deg, var(--primary), var(--tertiary))' }}
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: '100%', opacity: 1 }}
              transition={{ duration: 0.38, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
            />
          </motion.div>

          {/* Progress bar */}
          <div className="mt-10 h-[2px] w-36 overflow-hidden rounded-full"
            style={{ background: 'var(--surface-high, #0f0f1a)' }}>
            <motion.div
              className="h-full rounded-full"
              style={{ background: 'linear-gradient(90deg, var(--primary), var(--tertiary))' }}
              initial={{ width: '0%' }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.28, ease: 'easeOut' }}
            />
          </div>

          <motion.p
            className="mt-4 text-[10px] font-label uppercase tracking-[0.28em]"
            style={{ color: 'rgba(156,163,175,0.5)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.18 }}
          >
            Loading
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PageLoader;
