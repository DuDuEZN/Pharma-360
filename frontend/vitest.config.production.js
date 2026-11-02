/**
 * Vitest Configuration for Production Tests
 * Extended configuration for testing visual and functional integrity
 */

import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    // Environment
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.production.js'],
    
    // Coverage
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{js,jsx,ts,tsx}'],
      exclude: ['src/**/*.test.{js,jsx,ts,tsx}', 'src/**/*.spec.{js,jsx,ts,tsx}'],
    },
    
    // Timeout
    testTimeout: 10000,
    hookTimeout: 10000,
    
    // Output
    outputFile: {
      html: './test-results/production.html',
      json: './test-results/production.json',
    },
    
    // Watch mode
    watch: false,
    
    // Threads
    threads: true,
    maxThreads: 4,
    minThreads: 1,
    
    // Isolate
    isolate: false,
    
    // Pass tests even if there are console errors
    passWithNoTests: false,
    
    // Silent mode
    silent: false,
    
    // Chai config
    chaiConfig: {
      includeStack: true,
      showDiff: true,
    },
  },
});
