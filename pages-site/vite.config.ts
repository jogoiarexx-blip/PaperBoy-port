import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/postcss';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  base: '/PaperBoy-port/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('../', import.meta.url)),
    },
  },
  publicDir: fileURLToPath(new URL('../public', import.meta.url)),
  css: { postcss: { plugins: [tailwindcss()] } },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2020',
    sourcemap: false,
  },
});
