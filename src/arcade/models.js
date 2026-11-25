import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';

/**
 * Modelos GLB optimizados del arcade. Se cargan una sola vez y se clonan
 * (geometrías y materiales compartidos) para cada avión o isla.
 */
const MODELS = {
  fighter: { file: 'fighter_plane.glb', rot: [0, Math.PI, 0], size: 0.24 },
  interceptor: {
    file: 'stylized_interbellum_plane.glb',
    rot: [0, 0, 0],
    size: 0.24,
  },
  bomber: {
    file: 'wwii_soviet_plane.glb',
    rot: [Math.PI / 2, 0, Math.PI],
    size: 0.34,
  },
  escort: { file: 'j15t_plane.glb', rot: [0, 0, 0], size: 0.23 },
};

export const MODEL_BY_LANE = ['fighter', 'interceptor', 'bomber', 'escort'];

const cache = {};
const listeners = new Set();
const loader = new GLTFLoader();
let loading = null;
let ready = false;

function modelUrl(file) {
  return new URL(`models/${file}`, document.baseURI).href;
}

function markShared(root) {
  root.traverse((child) => {
    if (child.geometry) child.geometry.__shared = true;
    if (!child.material) return;
    const materials = Array.isArray(child.material)
      ? child.material
      : [child.material];
    for (const material of materials) {
      material.__shared = true;
      for (const key of [
        'map',
        'normalMap',
        'roughnessMap',
        'metalnessMap',
        'emissiveMap',
        'alphaMap',
      ]) {
        if (material[key]) material[key].__shared = true;
      }
    }
  });
}

export function preloadModels() {
  if (loading) return loading;

  loading = Promise.all(
    Object.entries(MODELS).map(async ([key, config]) => {
      try {
        const gltf = await loader.loadAsync(modelUrl(config.file));
        markShared(gltf.scene);
        cache[key] = { ...config, scene: gltf.scene };
      } catch (error) {
        console.warn(`No se pudo cargar ${config.file}`, error);
      }
    })
  ).then(() => {
    ready = true;
    for (const listener of listeners) listener();
    listeners.clear();
  });

  return loading;
}

export function whenModelsReady(listener) {
  preloadModels();
  if (ready) {
    listener();
    return;
  }
  listeners.add(listener);
}

/**
 * Devuelve un clon normalizado, centrado y girado del modelo.
 * `rot` permite orientar, por ejemplo, la isla tumbada sobre el mar.
 */
export function makeModel(key, size, rot = null) {
  const asset = cache[key];
  if (!asset) return null;

  const root = cloneSkinned(asset.scene);
  root.rotation.set(...(rot || asset.rot));
  root.updateMatrixWorld(true);

  const bounds = new THREE.Box3().setFromObject(root);
  const extent = bounds.getSize(new THREE.Vector3());
  const max = Math.max(extent.x, extent.y, extent.z) || 1;
  root.scale.multiplyScalar((size || asset.size) / max);
  root.updateMatrixWorld(true);

  const scaled = new THREE.Box3().setFromObject(root);
  const center = scaled.getCenter(new THREE.Vector3());
  root.position.sub(center);

  root.traverse((child) => {
    if (child.isMesh) {
      child.frustumCulled = true;
      child.castShadow = false;
      child.receiveShadow = false;
    }
  });

  return root;
}
