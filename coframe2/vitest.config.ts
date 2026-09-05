import { defineConfig } from 'vitest/config';

export default defineConfig({
  // `next build` rewrites tsconfig.json's "jsx" to "preserve" on every run
  // (Next.js applies its own JSX transform downstream and enforces this as a
  // "mandatory change"). Vitest's esbuild otherwise honours that setting, leaves
  // JSX untransformed, and every test that renders a generated section dies with
  // `ReferenceError: React is not defined`. Pinning the transform here keeps the
  // suite independent of whatever `next build` last wrote to tsconfig.json.
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: 'react',
  },
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    setupFiles: ['tests/setup.ts'],
    globals: true,
    restoreMocks: true,
  },
});
