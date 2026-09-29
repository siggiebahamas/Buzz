import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// SINGLE=1 builds one self-contained HTML file (used for the shareable preview).
export default defineConfig({
  plugins: [react(), ...(process.env.SINGLE ? [viteSingleFile()] : [])],
  // The live site is served from /Buzz/ on GitHub Pages; single-file previews use relative paths.
  base: process.env.SINGLE ? './' : '/Buzz/',
  build: process.env.SINGLE ? { outDir: 'dist-single' } : {},
});
