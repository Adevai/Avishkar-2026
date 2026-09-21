import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'server/**/*.test.ts'],
    // E2E suite needs a live PostgreSQL; keep default pool so it can share the DB
    testTimeout: 15000,
    hookTimeout: 15000,
    reporters: 'default',
  },
  // Server tests import TS sources directly — ensure esbuild handles them
  esbuild: {
    target: 'es2022',
  },
});
