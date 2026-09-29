import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// SINGLE=1 builds one self-contained HTML file (used for the shareable preview).
export default defineConfig({
  plugins: [react(), ...(process.env.SINGLE ? [viteSingleFile()] : [])],
  base: './',
  build: process.env.SINGLE ? { outDir: 'dist-single' } : {},
});
