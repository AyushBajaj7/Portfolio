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
export default defineConfig({
  /** Base URL for GitHub Pages - must match repository name */
  base: '/Portfolio/',
  plugins: [
    react(),
    tailwindcss(),
  ],
});
