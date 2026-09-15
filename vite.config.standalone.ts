/**
 * Builds the whole app into one self-contained HTML file.
 *
 * Everything is inlined and emitted as a classic (non-module) script, so the
 * result runs from a plain file:// double-click or any sandboxed embed, where
 * ES modules are refused. See scripts/bundle-standalone.mjs for the inlining.
 */

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist-standalone',
    emptyOutDir: true,
    cssCodeSplit: false,
    modulePreload: false,
    assetsInlineLimit: 100_000_000,
    rollupOptions: {
      output: {
        format: 'iife',
        inlineDynamicImports: true,
        entryFileNames: 'app.js',
        assetFileNames: 'app.[ext]',
      },
    },
  },
})
