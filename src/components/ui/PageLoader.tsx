/**
 * @fileoverview PageLoader component - Branded loading animation with progress indicator.
 * Shows on initial page load with Ayush Bajaj branding.
 * @author Ayush Bajaj
 */

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * PageLoader component - Displays branded loading screen with progress animation.
 * @returns {React.ReactElement | null} The loader or null when complete
 */
export const PageLoader: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let finishTimer: number | undefined;
    const interval = setInterval(() => {
      setProgress((prev) => {
        const newProgress = prev + 10;
        if (newProgress >= 100) {
          clearInterval(interval);
          finishTimer = window.setTimeout(() => setIsLoading(false), 300);
          return 100;
        }
        return newProgress;
      });
    }, 100);

    return () => {
      clearInterval(interval);
      if (finishTimer) window.clearTimeout(finishTimer);
    };
  }, []);

  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#0a0a0f]"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
        >
          <motion.div
            className="relative"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-4xl sm:text-6xl font-display font-bold tracking-tight text-on-surface">
              Ayush<span className="text-primary">.</span>
            </h1>

            <motion.div
              className="mt-2 h-[2px] bg-gradient-to-r from-primary to-tertiary"
              initial={{ width: 0 }}
              animate={{ width: '100%' }}
              transition={{ duration: 1, delay: 0.3 }}
            />
          </motion.div>

          <div className="mt-8 h-1 w-48 overflow-hidden rounded-full bg-surface-container-high">
            <motion.div
              className="h-full bg-gradient-to-r from-primary to-tertiary"
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(progress, 100)}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>

          <motion.p
            className="mt-4 text-xs font-label uppercase tracking-widest text-on-surface/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            Loading Experience
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PageLoader;
