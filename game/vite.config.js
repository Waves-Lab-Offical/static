// vite.config.js
import { defineConfig } from 'vite';

export default defineConfig({
    root: '.',
    base: './',
    build: {
        outDir: '../static',
        emptyOutDir: true,
        sourcemap: true,
        target: 'esnext',
    },
});