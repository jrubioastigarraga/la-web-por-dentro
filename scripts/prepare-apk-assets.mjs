import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

/**
 * Prepara los assets de la APK autocontenida:
 *  - copia dist/ a android/app/src/main/assets/web/
 *  - copia Three.js y los addons necesarios a web/vendor/
 *  - cambia el importmap de fpv.html para que no dependa de la CDN
 *
 * Uso:
 *   npm run build
 *   node scripts/prepare-apk-assets.mjs
 */
const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const dist = resolve(root, 'dist');
const dest = resolve(root, 'android', 'app', 'src', 'main', 'assets', 'web');
const three = resolve(root, 'node_modules', 'three');

if (!existsSync(resolve(dist, 'fpv.html'))) {
  console.error('Falta dist/. Ejecuta primero: npm run build');
  process.exit(1);
}
if (!existsSync(resolve(three, 'build', 'three.module.js'))) {
  console.error('Falta node_modules/three. Ejecuta: npm install');
  process.exit(1);
}

rmSync(dest, { recursive: true, force: true });
cpSync(dist, dest, { recursive: true });

const vendor = resolve(dest, 'vendor');
mkdirSync(resolve(vendor, 'addons', 'webxr'), { recursive: true });
mkdirSync(resolve(vendor, 'addons', 'loaders'), { recursive: true });
mkdirSync(resolve(vendor, 'addons', 'utils'), { recursive: true });

cpSync(
  resolve(three, 'build', 'three.module.js'),
  resolve(vendor, 'three.module.js')
);
cpSync(
  resolve(three, 'build', 'three.core.js'),
  resolve(vendor, 'three.core.js')
);
cpSync(
  resolve(three, 'examples', 'jsm', 'webxr', 'VRButton.js'),
  resolve(vendor, 'addons', 'webxr', 'VRButton.js')
);
cpSync(
  resolve(three, 'examples', 'jsm', 'loaders', 'GLTFLoader.js'),
  resolve(vendor, 'addons', 'loaders', 'GLTFLoader.js')
);
cpSync(
  resolve(three, 'examples', 'jsm', 'utils', 'BufferGeometryUtils.js'),
  resolve(vendor, 'addons', 'utils', 'BufferGeometryUtils.js')
);
cpSync(
  resolve(three, 'examples', 'jsm', 'utils', 'SkeletonUtils.js'),
  resolve(vendor, 'addons', 'utils', 'SkeletonUtils.js')
);

const fpvPath = resolve(dest, 'fpv.html');
let fpv = readFileSync(fpvPath, 'utf8');
fpv = fpv
  .replace(
    /"three"\s*:\s*"[^"]+"/,
    '"three": "./vendor/three.module.js"'
  )
  .replace(
    /"three\/addons\/"\s*:\s*"[^"]+"/,
    '"three/addons/": "./vendor/addons/"'
  );
writeFileSync(fpvPath, fpv);

console.log('Assets de la APK preparados en android/app/src/main/assets/web');
