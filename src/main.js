import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import {
  COLORS,
  disposeObject,
  initAudio,
  makeButton,
  makeGlow,
  sfx,
} from './util.js';
import { HUD } from './hud.js';
import { buildHub } from './hub.js';
import { rooms } from './rooms/index.js';

/* ------------------------------------------------------------ persistencia */

const STORAGE_KEY = 'lwpd.progress.v1';

function loadProgress() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    if (!Array.isArray(raw)) return [];
    return raw.filter((id) => rooms.some((room) => room.id === id));
  } catch {
    return [];
  }
}

const state = { progress: loadProgress(), roomId: null };

/* ------------------------------------------------------------------ tres */

const host = document.getElementById('app');

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  powerPreference: 'high-performance',
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
host.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(COLORS.bg);
scene.fog = new THREE.Fog(COLORS.bg, 3.4, 12);

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.03,
  80
);
camera.position.set(0, 1.6, 0);

const rig = new THREE.Group();
scene.add(rig);
rig.add(camera);

const look = { yaw: 0, pitch: -0.12 };

function applyLook() {
  camera.rotation.set(look.pitch, look.yaw, 0, 'YXZ');
}
applyLook();

/* ---------------------------------------------------------------- luces */

scene.add(new THREE.HemisphereLight(0x9cc0ff, 0x070b14, 1.2));

const keyLight = new THREE.DirectionalLight(0xffffff, 2.4);
keyLight.position.set(1.6, 3.4, 2.2);
scene.add(keyLight);

const rimTeal = new THREE.PointLight(COLORS.accent, 9, 9, 2);
rimTeal.position.set(-1.7, 2, -0.4);
scene.add(rimTeal);

const rimPurple = new THREE.PointLight(COLORS.purple, 4.5, 9, 2);
rimPurple.position.set(1.8, 1.4, -2.2);
scene.add(rimPurple);

/* ------------------------------------------------------------ escenario */

const env = new THREE.Group();
scene.add(env);

const base = new THREE.Mesh(
  new THREE.CylinderGeometry(0.98, 1.04, 0.07, 72),
  new THREE.MeshStandardMaterial({
    color: 0x0b1424,
    roughness: 0.5,
    metalness: 0.35,
  })
);
base.position.set(0, 0.9, -1.2);
env.add(base);

const baseRim = new THREE.Mesh(
  new THREE.TorusGeometry(0.99, 0.007, 8, 120),
  new THREE.MeshBasicMaterial({
    color: COLORS.accent,
    transparent: true,
    opacity: 0.5,
    toneMapped: false,
  })
);
baseRim.rotation.x = Math.PI / 2;
baseRim.position.set(0, 0.94, -1.2);
env.add(baseRim);

const grid = new THREE.GridHelper(26, 52, 0x1c2d47, 0x101a2b);
grid.position.y = 0;
grid.material.transparent = true;
grid.material.opacity = 0.5;
env.add(grid);

const starGeometry = new THREE.BufferGeometry();
const starPositions = new Float32Array(800 * 3);
for (let i = 0; i < 800; i++) {
  const radius = 5 + Math.random() * 10;
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  starPositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
  starPositions[i * 3 + 1] = Math.abs(radius * Math.cos(phi)) * 0.65 + 0.6;
  starPositions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
}
starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
const stars = new THREE.Points(
  starGeometry,
  new THREE.PointsMaterial({
    color: 0x9fc4ff,
    size: 0.028,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
  })
);
env.add(stars);

const backdrop = makeGlow('#1e6f8c', 4.6, 0.32);
backdrop.position.set(0, 1.35, -3);
env.add(backdrop);

const stage = new THREE.Group();
scene.add(stage);

/* ------------------------------------------------------------------ hud */

const hud = new HUD();
camera.add(hud.group);

const backButton = makeButton('← Volver al hub', { w: 0.29, h: 0.085 });
backButton.position.set(-0.86, 1.56, -1.32);
backButton.rotation.y = 0.58;
backButton.visible = false;
backButton.userData.onSelect = () => goHub();
scene.add(backButton);

/* ------------------------------------------------------- interacción */

const raycaster = new THREE.Raycaster();
raycaster.far = 9;
const pointer = new THREE.Vector2(0, 0);

function isVisible(object) {
  let node = object;
  while (node) {
    if (node.visible === false) return false;
    node = node.parent;
  }
  return true;
}

function resolveInteractive(object) {
  let node = object;
  while (node) {
    if (node.userData && node.userData.onSelect) return node;
    node = node.parent;
  }
  return null;
}

function pick(origin, direction) {
  raycaster.set(origin, direction);
  scene.updateMatrixWorld();
  const hits = raycaster.intersectObjects([stage, backButton], true);
  for (const hit of hits) {
    if (hit.object.userData.isLabel) continue;
    if (!isVisible(hit.object)) continue;
    const target = resolveInteractive(hit.object);
    if (target) return target;
  }
  return null;
}

function updatePointer(event) {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
}

function updateHover() {
  if (renderer.xr.isPresenting) {
    document.body.style.cursor = '';
    return;
  }
  camera.updateMatrixWorld();
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects([stage, backButton], true);

  let found = false;
  for (const hit of hits) {
    if (hit.object.userData.isLabel) continue;
    if (!isVisible(hit.object)) continue;
    if (resolveInteractive(hit.object)) {
      found = true;
      break;
    }
  }
  document.body.style.cursor = found ? 'pointer' : 'grab';
}

function selectFromScreen() {
  camera.updateMatrixWorld();
  raycaster.setFromCamera(pointer, camera);
  const target = pick(raycaster.ray.origin, raycaster.ray.direction);
  if (!target) return;
  initAudio();
  sfx.click();
  target.userData.onSelect();
}

/* -------------------------------------------------------- mandos VR */

const controllers = [];

function onXRSelect(event) {
  initAudio();
  const controller = event.target;
  const origin = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  controller.getWorldPosition(origin);
  controller.getWorldQuaternion(quaternion);
  const direction = new THREE.Vector3(0, 0, -1).applyQuaternion(quaternion);

  const target = pick(origin, direction);
  if (target) {
    sfx.click();
    target.userData.onSelect();
  }
}

for (let i = 0; i < 2; i++) {
  const controller = renderer.xr.getController(i);
  controller.visible = false;
  controller.addEventListener('selectstart', onXRSelect);

  const line = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -1),
    ]),
    new THREE.LineBasicMaterial({
      color: COLORS.accent,
      transparent: true,
      opacity: 0.6,
      toneMapped: false,
    })
  );
  line.scale.z = 2.4;
  controller.add(line);

  const tip = new THREE.Mesh(
    new THREE.SphereGeometry(0.008, 12, 8),
    new THREE.MeshBasicMaterial({ color: COLORS.accent, toneMapped: false })
  );
  tip.position.z = -2.4;
  controller.add(tip);

  rig.add(controller);
  controllers.push(controller);
}

const vrButton = VRButton.createButton(renderer);
document.body.appendChild(vrButton);

/* --------------------------------------------------------- ciclo de salas */

const timers = new Set();
const tickers = new Set();

function createApi(room) {
  return {
    room,
    isSolved: (id) => state.progress.includes(id),
    progressCount: () => state.progress.length,
    openRoom,
    goHub,
    click: sfx.click,
    say: (body, foot = '') => hud.set(room.title, body, foot, room.tone),
    ok: (body, foot = '') => {
      sfx.ok();
      hud.set(room.title, body, foot, '#4ade80');
    },
    err: (body, foot = '') => {
      sfx.err();
      hud.set(room.title, body, foot, '#ff5d73');
    },
    complete: (body) => {
      markSolved(room.id);
      sfx.win();
      hud.set(
        `✔ ${room.title}`,
        body,
        `Progreso ${state.progress.length}/${rooms.length} · vuelve al hub`,
        '#4ade80'
      );
    },
    after: (ms, fn) => {
      const id = setTimeout(() => {
        timers.delete(id);
        fn();
      }, ms);
      timers.add(id);
    },
    tick: (fn) => tickers.add(fn),
  };
}

function clearStage() {
  for (const id of timers) clearTimeout(id);
  timers.clear();
  tickers.clear();
  disposeObject(stage);
  stage.clear();
}

function markSolved(id) {
  if (state.progress.includes(id)) return;
  state.progress.push(id);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.progress));
  } catch {
    /* almacenamiento no disponible */
  }
  renderDots();
}

function openRoom(id) {
  const room = rooms.find((item) => item.id === id);
  if (!room) return;

  clearStage();
  state.roomId = id;
  document.body.classList.add('in-room');
  backButton.visible = true;
  const backBtn = document.getElementById('btn-back');
  if (backBtn) backBtn.hidden = false;

  const api = createApi(room);
  try {
    stage.add(room.build(api));
  } catch (error) {
    console.error(error);
    hud.set(
      room.title,
      'Esta sala no ha podido cargarse. Vuelve al hub e inténtalo de nuevo.',
      String(error),
      '#ff5d73'
    );
  }
}

function goHub() {
  clearStage();
  state.roomId = null;
  document.body.classList.remove('in-room');
  backButton.visible = false;
  const backBtn = document.getElementById('btn-back');
  if (backBtn) backBtn.hidden = true;

  const api = createApi({ id: 'hub', title: 'La Web por Dentro', tone: '#4de2c5' });
  stage.add(buildHub(api));
}

/* ------------------------------------------------------------------ html */

const dotsEl = document.getElementById('dots');

function renderDots() {
  if (!dotsEl) return;
  dotsEl.innerHTML = '';
  for (const room of rooms) {
    const dot = document.createElement('span');
    dot.className = state.progress.includes(room.id) ? 'dot on' : 'dot';
    dot.title = room.title;
    dotsEl.appendChild(dot);
  }
}

document.getElementById('btn-back')?.addEventListener('click', () => {
  initAudio();
  goHub();
});

document.getElementById('btn-reset')?.addEventListener('click', () => {
  const ok = window.confirm('¿Reiniciar el progreso de las 5 salas?');
  if (!ok) return;
  state.progress = [];
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* sin almacenamiento */
  }
  renderDots();
  goHub();
});

window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && state.roomId) goHub();
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

/* ------------------------------------------------------------ puntero 2D */

const dom = renderer.domElement;
let pointerDown = null;
let dragging = false;

dom.addEventListener('pointerdown', (event) => {
  if (renderer.xr.isPresenting) return;
  updatePointer(event);
  pointerDown = { x: event.clientX, y: event.clientY };
  dragging = false;
  try {
    dom.setPointerCapture(event.pointerId);
  } catch {
    /* sin captura */
  }
});

window.addEventListener('pointermove', (event) => {
  updatePointer(event);

  if (pointerDown && !renderer.xr.isPresenting) {
    const dx = event.clientX - pointerDown.x;
    const dy = event.clientY - pointerDown.y;
    if (!dragging && Math.abs(dx) + Math.abs(dy) > 4) dragging = true;
    if (dragging) {
      look.yaw = THREE.MathUtils.clamp(look.yaw - dx * 0.0028, -0.8, 0.8);
      look.pitch = THREE.MathUtils.clamp(look.pitch - dy * 0.0028, -0.65, 0.45);
      pointerDown = { x: event.clientX, y: event.clientY };
      applyLook();
    }
  }

  updateHover();
});

window.addEventListener('pointerup', (event) => {
  if (renderer.xr.isPresenting) {
    pointerDown = null;
    dragging = false;
    return;
  }
  const wasDragging = dragging;
  pointerDown = null;
  dragging = false;
  if (wasDragging) return;
  updatePointer(event);
  selectFromScreen();
});

window.addEventListener('pointercancel', () => {
  pointerDown = null;
  dragging = false;
});

/* ------------------------------------------------------------------ xr */

renderer.xr.addEventListener('sessionstart', () => {
  document.body.classList.add('xr');
  for (const controller of controllers) controller.visible = true;
});

renderer.xr.addEventListener('sessionend', () => {
  document.body.classList.remove('xr');
  for (const controller of controllers) controller.visible = false;
  camera.position.set(0, 1.6, 0);
  applyLook();
});

/* ------------------------------------------------------------------ loop */

const timer = new THREE.Timer();
timer.connect(document);
let firstFrame = true;

renderer.setAnimationLoop(() => {
  timer.update();
  const dt = Math.min(timer.getDelta(), 0.05);
  const t = timer.getElapsed();

  for (const ticker of tickers) ticker(dt, t);

  stars.rotation.y += dt * 0.004;
  baseRim.material.opacity = 0.22 + Math.sin(t * 1.4) * 0.05;

  renderer.render(scene, camera);

  if (firstFrame) {
    firstFrame = false;
    document.getElementById('loader')?.classList.add('done');
  }
});

/* ------------------------------------------------------------------ init */

renderDots();
goHub();
