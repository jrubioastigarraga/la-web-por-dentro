import { defineConfig } from 'vite';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const file = (name) => fileURLToPath(new URL(`./${name}`, import.meta.url));

// La portada (index.html) y la cabina FPV (fpv.html) son juegos WebXR
// autocontenidos que cargan Three.js desde CDN con importmap. Se emiten tal
// cual para no perder esa condición de "un único archivo". La versión modular
// del arcade clásico se compila aparte como arcade-clasico.html.
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
      name: 'emit-standalone-pages',
      apply: 'build',
      generateBundle() {
        for (const name of ['index.html', 'fpv.html']) {
          this.emitFile({
            type: 'asset',
            fileName: name,
            source: readFileSync(file(name), 'utf8'),
          });
        }
      },
    },
  ],
});
