import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  publicDir: 'public',
  build: {
    outDir: '../docs/brazilian-coffee-house',
    emptyOutDir: true,
    sourcemap: false,
  },
});
