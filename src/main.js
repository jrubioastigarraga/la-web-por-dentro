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
import { buildMenu } from './menu.js';
import { buildArcade } from './arcade/game.js';
import { SECTORS } from './arcade/questions.js';
import { applyStaticText, setLang, t, sectorTitle } from './i18n.js';
import {
  fetchMoodleQuestions,
  loadMoodleConfig,
  saveMoodleConfig,
} from './moodle.js';

/* ------------------------------------------------------------ persistencia */

const STORAGE_KEY = 'lwpd.arcade.v1';

function loadSave() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return {
      best: Number(raw.best) || 0,
      sectors: Math.min(SECTORS.length, Number(raw.sectors) || 0),
    };
  } catch {
    return { best: 0, sectors: 0 };
  }
}

const save = loadSave();
const state = { screen: 'menu' };
let game = null;

/* ------------------------------------------------------------------ tres */

const host = document.getElementById('app');
const landing = document.getElementById('landing');

function setLanding(visible) {
  if (!landing) return;
  landing.hidden = !visible;
  document.body.classList.toggle('landing', visible);
}

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  powerPreference: 'high-performance',
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
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

const look = { yaw: 0, pitch: -0.14 };

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

const grid = new THREE.GridHelper(26, 52, 0x1c2d47, 0x101a2b);
grid.position.y = 0.05;
grid.material.transparent = true;
grid.material.opacity = 0.35;
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

const backButton = makeButton('← Menú', { w: 0.2, h: 0.07 });
backButton.position.set(-0.86, 0.84, -1.25);
backButton.rotation.y = 0.5;
backButton.visible = false;
backButton.userData.onSelect = () => showMenu();
scene.add(backButton);

// Salidas siempre disponibles dentro de WebXR (en escritorio están en la
// barra superior HTML): volver a la portada o saltar a la cabina FPV.
const homeButton = makeButton('INICIO', { w: 0.21, h: 0.065, color: '#93a7bd' });
homeButton.position.set(0.58, 0.28, -0.9);
homeButton.visible = false;
homeButton.renderOrder = 1000;
if (homeButton.material) homeButton.material.depthTest = false;
homeButton.userData.onSelect = () => {
  window.location.href = './index.html';
};
camera.add(homeButton);

const fpvButton = makeButton('FPV', { w: 0.17, h: 0.06, color: '#4de2c5' });
fpvButton.position.set(0.58, 0.19, -0.9);
fpvButton.visible = false;
fpvButton.renderOrder = 1000;
if (fpvButton.material) fpvButton.material.depthTest = false;
fpvButton.userData.onSelect = () => {
  window.location.href = './fpv.html';
};
camera.add(fpvButton);

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
  const hits = raycaster.intersectObjects([stage, backButton, homeButton, fpvButton], true);
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
  if (game) {
    document.body.style.cursor = 'crosshair';
    return;
  }
  camera.updateMatrixWorld();
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects([stage, backButton, homeButton, fpvButton], true);

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
    return;
  }

  if (game && game.handleXR(origin, direction)) return;
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

/* --------------------------------------------------------------- pantallas */

const timers = new Set();
const tickers = new Set();

function after(ms, fn) {
  const id = setTimeout(() => {
    timers.delete(id);
    fn();
  }, ms);
  timers.add(id);
}

function tick(fn) {
  tickers.add(fn);
}

function setHud(title, body, foot = '', tone = '#4de2c5') {
  hud.set(title, body, foot, tone);
}

function submitScore(score, sectors) {
  let changed = false;
  if (score > save.best) {
    save.best = score;
    changed = true;
  }
  if (sectors > save.sectors) {
    save.sectors = Math.min(SECTORS.length, sectors);
    changed = true;
  }
  if (!changed) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(save));
  } catch {
    /* almacenamiento no disponible */
  }
  renderDots();
}

const api = {
  setHud,
  ok: (body, foot = '') => {
    sfx.ok();
    setHud(currentTitle(), body, foot, '#4ade80');
  },
  err: (body, foot = '') => {
    sfx.err();
    setHud(currentTitle(), body, foot, '#ff5d73');
  },
  after,
  tick,
  startGame,
  showMenu,
  playMoodle: quickMoodle,
  exitToGameHome: () => {
    window.location.href = './arcade-clasico.html';
  },
  submitScore,
  get best() {
    return save.best;
  },
  get bestSectors() {
    return save.sectors;
  },
};

function currentTitle() {
  return game ? game.header() : 'ESCUADRÓN WEB';
}

function clearStage() {
  for (const id of timers) clearTimeout(id);
  timers.clear();
  tickers.clear();
  disposeObject(stage);
  stage.clear();
}

function startGame(opts = {}) {
  clearStage();
  state.screen = 'game';
  setLanding(false);
  document.body.classList.add('in-game');
  backButton.visible = renderer.xr.isPresenting;
  const backBtn = document.getElementById('btn-back');
  if (backBtn) backBtn.hidden = false;

  hud.group.visible = false;
  game = buildArcade(api, opts);
  stage.add(game.group);
  document.body.style.cursor = 'crosshair';
}

function showMenu() {
  clearStage();
  game = null;
  state.screen = 'menu';
  document.body.classList.remove('in-game');
  backButton.visible = false;
  const backBtn = document.getElementById('btn-back');
  if (backBtn) backBtn.hidden = true;

  hud.group.visible = true;
  stage.add(buildMenu(api));
  setLanding(true);
  document.body.style.cursor = '';
}

/* ------------------------------------------------------------------ html */

const dotsEl = document.getElementById('dots');

function renderDots() {
  if (!dotsEl) return;
  dotsEl.innerHTML = '';
  for (let i = 0; i < SECTORS.length; i++) {
    const dot = document.createElement('span');
    dot.className = i < save.sectors ? 'dot on' : 'dot';
    dot.title = sectorTitle(SECTORS[i]);
    dotsEl.appendChild(dot);
  }
}

/* --------------------------------------------------------------- idioma */

document.getElementById('langs')?.addEventListener('click', (event) => {
  const button = event.target.closest('[data-lang]');
  if (!button) return;
  setLang(button.dataset.lang);
  applyStaticText();
  renderDots();
  if (state.screen === 'menu') showMenu();
  else if (game) game.refreshLanguage();
});

/* --------------------------------------------------------------- moodle */

const modal = document.getElementById('moodle-modal');
const moodleStatus = document.getElementById('moodle-status');
const apiInput = document.getElementById('moodle-api');
const quizInput = document.getElementById('moodle-quiz');

function setMoodleStatus(text, kind = '') {
  if (!moodleStatus) return;
  moodleStatus.textContent = text || '';
  moodleStatus.className = `status${kind ? ` ${kind}` : ''}`;
}

function openMoodle() {
  const config = loadMoodleConfig();
  if (apiInput) apiInput.value = config.api;
  if (quizInput) quizInput.value = config.quiz;
  setMoodleStatus('');
  if (modal) modal.hidden = false;
  setTimeout(() => (apiInput?.value ? quizInput : apiInput)?.focus(), 60);
}

function closeMoodle() {
  if (modal) modal.hidden = true;
}

function startMoodleGame(questions) {
  const tones = ['#4de2c5', '#ffb454', '#a78bfa', '#60a5fa', '#f472b6'];
  const sectors = questions.map((question, index) => ({
    id: `moodle-${index}`,
    title: 'Moodle',
    titleEu: 'Moodle',
    tag: t('moodleMode', { n: questions.length }),
    tone: tones[index % tones.length],
    color: 0x4de2c5,
    brief: t('moodleQuestion', {
      n: index + 1,
      total: questions.length,
    }),
    questions: [question],
  }));

  closeMoodle();
  startGame({
    moodle: true,
    sectors,
    perSector: 1,
  });
}

async function runMoodle(play) {
  const config = saveMoodleConfig({
    api: apiInput?.value,
    quiz: quizInput?.value,
  });

  if (!config.api) {
    setMoodleStatus(t('moodleNeedApi'), 'error');
    return;
  }

  setMoodleStatus(t('moodleLoading'));
  try {
    const questions = await fetchMoodleQuestions(config);
    setMoodleStatus(t('moodleReady', { n: questions.length }), 'ok');
    if (!play) return;
    startMoodleGame(questions);
  } catch (error) {
    console.error(error);
    setMoodleStatus(`${t('moodleError')} (${error.message})`, 'error');
  }
}

function saveMoodleOnly() {
  const config = saveMoodleConfig({
    api: apiInput?.value,
    quiz: quizInput?.value,
  });
  if (!config.api) {
    setMoodleStatus(t('moodleNeedApi'), 'error');
    return;
  }
  setMoodleStatus(t('moodleSaved'), 'ok');
}

/**
 * Inicio rápido desde el menú 3D (también en VR): usa la configuración
 * guardada, sin abrir el formulario.
 */
async function quickMoodle() {
  const config = loadMoodleConfig();

  hud.set('MOODLE', t('moodleLoading'), '', '#4de2c5');

  try {
    const questions = await fetchMoodleQuestions(config);
    startMoodleGame(questions);
  } catch (error) {
    console.error(error);
    hud.set(
      'MOODLE',
      t('moodleError'),
      `${error.message} · ${t('moodleHint')}`,
      '#ff5d73'
    );
  }
}

document.getElementById('btn-moodle')?.addEventListener('click', () => {
  initAudio();
  openMoodle();
});

document.getElementById('landing-campaign')?.addEventListener('click', () => {
  initAudio();
  startGame({ sector: null });
});

document.getElementById('landing-moodle')?.addEventListener('click', () => {
  initAudio();
  openMoodle();
});

document.getElementById('moodle-close')?.addEventListener('click', closeMoodle);

document.getElementById('moodle-save')?.addEventListener('click', () => {
  initAudio();
  saveMoodleOnly();
});

document.getElementById('moodle-test')?.addEventListener('click', () => {
  runMoodle(false);
});

document.getElementById('moodle-local')?.addEventListener('click', () => {
  closeMoodle();
  initAudio();
  startGame({ sector: null });
});

document.getElementById('moodle-form')?.addEventListener('submit', (event) => {
  event.preventDefault();
  initAudio();
  runMoodle(true);
});

document.getElementById('btn-back')?.addEventListener('click', () => {
  initAudio();
  showMenu();
});

document.getElementById('btn-reset')?.addEventListener('click', () => {
  const ok = window.confirm(t('resetConfirm'));
  if (!ok) return;
  save.best = 0;
  save.sectors = 0;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* sin almacenamiento */
  }
  renderDots();
  showMenu();
});

window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    if (modal && !modal.hidden) {
      closeMoodle();
      return;
    }
    if (state.screen !== 'menu') {
      showMenu();
      return;
    }
    window.location.href = './index.html';
    return;
  }

  if (state.screen === 'menu' && event.key === 'Enter') {
    initAudio();
    startGame({ sector: null });
    return;
  }

  if (!game) return;

  if (event.code === 'Space') {
    event.preventDefault();
    initAudio();
    game.fire();
    return;
  }

  if (event.key === 'ArrowLeft' || event.key === 'a' || event.key === 'A') {
    game.nudge(-1);
  } else if (
    event.key === 'ArrowRight' ||
    event.key === 'd' ||
    event.key === 'D'
  ) {
    game.nudge(1);
  }
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
  initAudio();

  if (game && game.isPlaying()) {
    game.pointerMove(pointer.x);
    game.setFiring(true);
    return;
  }

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

  if (game) {
    game.pointerMove(pointer.x);
    if (game.isPlaying()) {
      document.body.style.cursor = 'crosshair';
      return;
    }
  }

  if (pointerDown && !renderer.xr.isPresenting) {
    const dx = event.clientX - pointerDown.x;
    const dy = event.clientY - pointerDown.y;
    if (!dragging && Math.abs(dx) + Math.abs(dy) > 4) dragging = true;
    pointerDown = { x: event.clientX, y: event.clientY };
  }

  updateHover();
});

window.addEventListener('pointerup', (event) => {
  if (renderer.xr.isPresenting) {
    pointerDown = null;
    dragging = false;
    return;
  }

  if (game) game.setFiring(false);

  const wasDragging = dragging;
  pointerDown = null;
  dragging = false;

  if (game && game.isPlaying()) return;
  if (wasDragging) return;

  updatePointer(event);
  selectFromScreen();
});

window.addEventListener('pointercancel', () => {
  if (game) game.setFiring(false);
  pointerDown = null;
  dragging = false;
});

/* ------------------------------------------------------------------ xr */

renderer.xr.addEventListener('sessionstart', () => {
  document.body.classList.add('xr');
  for (const controller of controllers) controller.visible = true;
  backButton.visible = state.screen === 'game';
  homeButton.visible = true;
  fpvButton.visible = true;
});

renderer.xr.addEventListener('sessionend', () => {
  document.body.classList.remove('xr');
  for (const controller of controllers) controller.visible = false;
  backButton.visible = false;
  homeButton.visible = false;
  fpvButton.visible = false;
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

  renderer.render(scene, camera);

  if (firstFrame) {
    firstFrame = false;
    document.getElementById('loader')?.classList.add('done');
  }
});

/* ------------------------------------------------------------------ init */

// Pequeño gancho de depuración (útil para pruebas automáticas y para el aula).
window.__arcade = {
  startGame,
  showMenu,
  playMoodle: quickMoodle,
  get game() {
    return game;
  },
  get save() {
    return save;
  },
};

/**
 * Permite configurar la API por enlace, útil en Pico 4:
 *   ?api=http://172.16.35.2/escuadron-api&quiz=quiz:39&start=1
 *   ?api=http://172.16.35.2/escuadron-api&cmid=7772&start=1
 */
function applyUrlConfig() {
  const params = new URLSearchParams(window.location.search);
  const config = loadMoodleConfig();
  let changed = false;

  const api = params.get('api');
  if (api) {
    config.api = api;
    changed = true;
  }
  const quiz = params.get('quiz');
  if (quiz) {
    config.quiz = quiz;
    changed = true;
  }
  const cmid = params.get('cmid');
  if (cmid) {
    config.quiz = `cmid:${cmid}`;
    changed = true;
  }
  if (changed) saveMoodleConfig(config);

  const lang = params.get('lang');
  if (lang === 'eu' || lang === 'es') {
    setLang(lang);
  }

  if (window.location.hash) {
    window.history.replaceState(
      null,
      '',
      window.location.pathname + window.location.search
    );
  }

  return params.get('start') === '1' || params.get('play') === '1';
}

const autostartMoodle = applyUrlConfig();

renderDots();
applyStaticText();
showMenu();

if (autostartMoodle) {
  setTimeout(() => quickMoodle(), 250);
}
