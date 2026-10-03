/// <reference types="vite/client" />

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { execSync } from 'node:child_process';
import { notesPlugin, seoPlugin } from './build/site.ts';

// короткий SHA коммита, из которого собран сайт: в CI — GITHUB_SHA, локально — git
const commit = (() => {
  try {
    return (process.env.GITHUB_SHA ?? execSync('git rev-parse HEAD').toString()).trim().slice(0, 7);
  } catch {
    return 'dev';
  }
})();

export default defineConfig({
  plugins: [react(), notesPlugin(), seoPlugin()],
  define: {
    __COMMIT__: JSON.stringify(commit)
  },
  build: {
    target: 'esnext',
    minify: true
  }
});
