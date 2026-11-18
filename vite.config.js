import { defineConfig } from 'vite';

// base './' permite publicar en GitHub Pages bajo /nombre-del-repo/
// sin tener que tocar rutas al mover el proyecto.
export default defineConfig({
  base: './',
  server: { host: true },
  build: { target: 'es2020' },
});
