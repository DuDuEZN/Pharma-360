import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react()],
  test: {
    // Configuration globale des tests
    globals: true,
    environment: 'jsdom',
    setupFiles: './tests/setup.js',
    
    // Coverage (optionnel)
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        '.vite/',
      ],
    },
    
    // Timeout
    testTimeout: 10000,
    hookTimeout: 10000,
    
    // Fichiers à tester
    include: ['tests/**/*.{test,spec}.{js,mjs,cjs,jsx,ts,tsx}'],
    
    // Mock des modules
    mockReset: true,
    
    // Reporter
    reporters: ['default', 'json'],
    outputFile: 'test-results.json',
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': { target: 'http://localhost:8000', changeOrigin: true },
      '/ws': { target: 'ws://localhost:8000', ws: true },
    },
  },
});
