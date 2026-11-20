import { defineConfig } from 'vite';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const file = (name) => fileURLToPath(new URL(`./${name}`, import.meta.url));

// La portada (index.html) es un juego WebXR autocontenido que carga Three.js
// desde CDN con importmap. Se emite tal cual para no perder esa condición de
// "un único archivo". La versión modular original se compila aparte como
// arcade-clasico.html.
export default defineConfig({
  base: './',
  server: { host: true },
  build: {
    target: 'es2020',
    rollupOptions: {
      input: {
        clasico: file('arcade-clasico.html'),
      },
    },
  },
  plugins: [
    {
      name: 'emit-standalone-vr-index',
      apply: 'build',
      generateBundle() {
        this.emitFile({
          type: 'asset',
          fileName: 'index.html',
          source: readFileSync(file('index.html'), 'utf8'),
        });
      },
    },
  ],
});
