import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],

  // GOTCHA: `next build` rewrites tsconfig.json's "jsx" to "preserve" on every
  // run, which would otherwise break Vitest's JSX transform. Pin it here so the
  // test run is immune to whatever Next last wrote into tsconfig.
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: 'react',
  },

  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname),
    },
  },

  test: {
    environment: 'jsdom',
    globals: true,
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    setupFiles: ['./tests/setup.ts'],
    css: false,
  },
});
