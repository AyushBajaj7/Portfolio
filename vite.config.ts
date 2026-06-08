/**
 * @fileoverview Vite configuration for the portfolio application.
 * Configures build settings, base URL for GitHub Pages deployment, and plugins.
 * @author Ayush Bajaj
 */

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

/**
 * Vite configuration object.
 * Base URL set to '/Portfolio/' for GitHub Pages deployment.
 */
export default defineConfig(({ command }) => ({
  /** Base URL: '/' for Vercel, '/Portfolio/' for GitHub Pages */
  base: process.env.VERCEL ? '/' : '/Portfolio/',
  /** Copy public assets in the post-build script; Vite's build copier hangs on the large frame set on Windows. */
  publicDir: command === 'build' ? false : 'public',
  plugins: [
    react(),
    tailwindcss(),
  ],
}));
