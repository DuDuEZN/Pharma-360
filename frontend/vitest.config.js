import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [react()],
  // Les fichiers de tests (tests/*.test.js) contiennent du JSX : on demande à esbuild
  // de traiter aussi les .js de src/ et tests/ comme du JSX (sinon : "Failed to parse source").
  esbuild: {
    loader: 'jsx',
    include: /\/(src|tests)\/.*\.jsx?$/,
    exclude: [],
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
    css: true,
    include: ['./tests/**/*.test.{js,jsx}'],
  },
})
