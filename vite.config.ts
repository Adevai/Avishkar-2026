import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
  build: {
    // Fail the build when the minified bundle exceeds sensible budgets
    chunkSizeWarningLimit: 900,
    // Modern browsers only — smaller output, no legacy transforms
    target: 'es2020',
    cssCodeSplit: true,
    // Deterministic hashed assets: immutable long-cache headers on the CDN/host
    rollupOptions: {
      output: {
        // Keep heavy charting/animation deps in their own cacheable chunks
        manualChunks(id: string) {
          if (!id.includes('node_modules')) return undefined;
          if (/[\\/]recharts[\\/]|[\\/]d3-[a-z]+[\\/]|[\\/]victory-vendor[\\/]/.test(id)) return 'charts';
          if (/[\\/]framer-motion[\\/]/.test(id)) return 'motion';
          return undefined;
        },
      },
    },
  },
});
