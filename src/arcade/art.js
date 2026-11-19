import * as THREE from 'three';
import { COLORS, FONT, roundRect } from '../util.js';

/* --------------------------------------------------------------- lienzos */

function makeCanvas(w, h) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  return { canvas, ctx: canvas.getContext('2d') };
}

function toTexture(canvas, repeat = false) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  if (repeat) {
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
  }
  return tex;
}

/* ------------------------------------------------------------ mar y cielo */

export function makeSeaBaseTexture() {
  const { canvas, ctx } = makeCanvas(512, 512);
  const grad = ctx.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, '#0a3358');
  grad.addColorStop(0.35, '#0f4f7c');
  grad.addColorStop(0.68, '#1476a2');
  grad.addColorStop(1, '#1a93b4');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);

  // vetas de oleaje
  for (let i = 0; i < 90; i++) {
    const y = Math.random() * 512;
    const x = Math.random() * 512;
    const w = 20 + Math.random() * 90;
    ctx.strokeStyle = `rgba(180,235,255,${0.02 + Math.random() * 0.05})`;
    ctx.lineWidth = 1 + Math.random() * 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + w / 2, y - 5 - Math.random() * 6, x + w, y);
    ctx.stroke();
  }

  return toTexture(canvas);
}

export function makeWaterTexture() {
  const { canvas, ctx } = makeCanvas(256, 256);
  ctx.clearRect(0, 0, 256, 256);

  for (let i = 0; i < 60; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const w = 6 + Math.random() * 26;
    ctx.strokeStyle = `rgba(220,250,255,${0.05 + Math.random() * 0.12})`;
    ctx.lineWidth = 1 + Math.random();
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + w / 2, y - 3, x + w, y);
    ctx.stroke();
  }

  for (let i = 0; i < 40; i++) {
    ctx.fillStyle = `rgba(255,255,255,${0.04 + Math.random() * 0.1})`;
    ctx.fillRect(Math.random() * 256, Math.random() * 256, 1.5, 1.5);
  }

  return toTexture(canvas, true);
}

function blobPath(ctx, cx, cy, radius, wobble, points = 14) {
  const pts = [];
  for (let i = 0; i < points; i++) {
    const a = (i / points) * Math.PI * 2;
    const r = radius * (1 - wobble + Math.random() * wobble * 2);
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.86]);
  }

  ctx.beginPath();
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  let prev = pts[pts.length - 1];
  let start = mid(prev, pts[0]);
  ctx.moveTo(start[0], start[1]);
  for (let i = 0; i < pts.length; i++) {
    const next = pts[(i + 1) % pts.length];
    const m = mid(pts[i], next);
    ctx.quadraticCurveTo(pts[i][0], pts[i][1], m[0], m[1]);
  }
  ctx.closePath();
}

export function makeIslandTexture(variant = 0) {
  const { canvas, ctx } = makeCanvas(256, 256);
  ctx.clearRect(0, 0, 256, 256);

  const cx = 128 + (Math.random() - 0.5) * 18;
  const cy = 128 + (Math.random() - 0.5) * 18;
  const radius = 66 + Math.random() * 26;

  // bajío
  ctx.fillStyle = 'rgba(90,220,220,0.28)';
  blobPath(ctx, cx, cy, radius * 1.24, 0.16);
  ctx.fill();

  // arena
  const sand = ctx.createLinearGradient(cx - radius, cy - radius, cx + radius, cy + radius);
  sand.addColorStop(0, '#f2dfa8');
  sand.addColorStop(1, '#d9bd7f');
  ctx.fillStyle = sand;
  blobPath(ctx, cx, cy, radius, 0.16);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // vegetación
  const green = ctx.createRadialGradient(cx - 20, cy - 24, 8, cx, cy, radius * 0.72);
  green.addColorStop(0, variant % 2 ? '#3f8f52' : '#357a46');
  green.addColorStop(1, '#1e5230');
  ctx.fillStyle = green;
  blobPath(ctx, cx, cy, radius * 0.66, 0.22);
  ctx.fill();

  // motas de bosque y roca
  for (let i = 0; i < 70; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = Math.sqrt(Math.random()) * radius * 0.58;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r * 0.86;
    const dark = Math.random() > 0.5;
    ctx.fillStyle = dark ? 'rgba(10,55,30,0.55)' : 'rgba(120,190,120,0.35)';
    ctx.beginPath();
    ctx.arc(x, y, 2 + Math.random() * 5, 0, Math.PI * 2);
    ctx.fill();
  }

  // riachuelo
  if (variant % 3 === 0) {
    ctx.strokeStyle = 'rgba(110,215,235,0.75)';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx - 4, cy - radius * 0.55);
    ctx.quadraticCurveTo(cx + 18, cy - 4, cx + 2, cy + radius * 0.55);
    ctx.stroke();
  }

  return toTexture(canvas);
}

export function makeCloudTexture() {
  const { canvas, ctx } = makeCanvas(512, 320);
  for (let i = 0; i < 20; i++) {
    const x = 80 + Math.random() * 352;
    const y = 90 + Math.random() * 120;
    const r = 46 + Math.random() * 72;
    const grad = ctx.createRadialGradient(x, y - 10, 4, x, y, r);
    grad.addColorStop(0, 'rgba(255,255,255,0.85)');
    grad.addColorStop(0.55, 'rgba(240,250,255,0.34)');
    grad.addColorStop(1, 'rgba(220,240,255,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  return toTexture(canvas);
}

/* ------------------------------------------------------------- partículas */

export function makeGlowTexture(inner = 'rgba(255,255,255,1)', outer = 'rgba(255,180,80,0)') {
  const { canvas, ctx } = makeCanvas(128, 128);
  const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, inner);
  grad.addColorStop(0.35, inner.replace(/[\d.]+\)$/, '0.55)'));
  grad.addColorStop(1, outer);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  return toTexture(canvas);
}

export function makeFireTexture() {
  const { canvas, ctx } = makeCanvas(128, 128);
  const grad = ctx.createRadialGradient(64, 64, 2, 64, 64, 62);
  grad.addColorStop(0, 'rgba(255,252,230,1)');
  grad.addColorStop(0.22, 'rgba(255,226,140,0.98)');
  grad.addColorStop(0.5, 'rgba(255,150,55,0.9)');
  grad.addColorStop(0.78, 'rgba(225,70,25,0.45)');
  grad.addColorStop(1, 'rgba(180,30,10,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  return toTexture(canvas);
}

export function makeSmokeTexture() {
  const { canvas, ctx } = makeCanvas(128, 128);
  const grad = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
  grad.addColorStop(0, 'rgba(120,130,140,0.65)');
  grad.addColorStop(0.55, 'rgba(90,100,110,0.35)');
  grad.addColorStop(1, 'rgba(60,70,80,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);

  for (let i = 0; i < 26; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = Math.random() * 52;
    ctx.fillStyle = `rgba(${150 + Math.random() * 40},${150 + Math.random() * 40},${160 + Math.random() * 40},0.12)`;
    ctx.beginPath();
    ctx.arc(64 + Math.cos(a) * r, 64 + Math.sin(a) * r, 4 + Math.random() * 12, 0, Math.PI * 2);
    ctx.fill();
  }
  return toTexture(canvas);
}

export function makeShadowTexture() {
  const { canvas, ctx } = makeCanvas(128, 128);
  const grad = ctx.createRadialGradient(64, 64, 2, 64, 64, 60);
  grad.addColorStop(0, 'rgba(0,10,20,0.55)');
  grad.addColorStop(0.6, 'rgba(0,10,20,0.22)');
  grad.addColorStop(1, 'rgba(0,10,20,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  return toTexture(canvas);
}

export function makeVignetteTexture() {
  const { canvas, ctx } = makeCanvas(256, 256);
  const grad = ctx.createRadialGradient(128, 128, 60, 128, 128, 160);
  grad.addColorStop(0, 'rgba(255,40,60,0)');
  grad.addColorStop(0.55, 'rgba(255,40,60,0.05)');
  grad.addColorStop(0.82, 'rgba(255,30,50,0.26)');
  grad.addColorStop(1, 'rgba(255,20,40,0.55)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);
  return toTexture(canvas);
}

export function makeDangerTexture() {
  const { canvas, ctx } = makeCanvas(512, 16);
  ctx.clearRect(0, 0, 512, 16);
  ctx.fillStyle = 'rgba(255,93,115,0.85)';
  for (let x = 0; x < 512; x += 26) {
    ctx.fillRect(x, 6, 14, 3);
  }
  return toTexture(canvas);
}

/* ---------------------------------------------------------------- aviones */

const PLANE_PALETTES = {
  player: {
    body: '#e8f1f7',
    shade: '#9db3c6',
    dark: '#4d6478',
    accent: '#4de2c5',
    glass: '#8fe6ff',
    prop: 'rgba(220,255,255,0.8)',
  },
  red: {
    body: '#e2576a',
    shade: '#a82f42',
    dark: '#5c1420',
    accent: '#ffd479',
    glass: '#a9ecff',
    prop: 'rgba(255,220,220,0.7)',
  },
  amber: {
    body: '#f0b24c',
    shade: '#b87a1f',
    dark: '#5f3b06',
    accent: '#fff0b8',
    glass: '#bdf4ff',
    prop: 'rgba(255,240,190,0.7)',
  },
  purple: {
    body: '#a98cf5',
    shade: '#6d52bd',
    dark: '#332266',
    accent: '#ffe3a3',
    glass: '#c8f4ff',
    prop: 'rgba(235,225,255,0.7)',
  },
};

export function makePlaneTexture(kind = 'player') {
  const p = PLANE_PALETTES[kind] || PLANE_PALETTES.player;
  const { canvas, ctx } = makeCanvas(256, 256);
  ctx.translate(128, 128);

  const bodyGrad = ctx.createLinearGradient(-24, 0, 24, 0);
  bodyGrad.addColorStop(0, p.shade);
  bodyGrad.addColorStop(0.45, p.body);
  bodyGrad.addColorStop(0.72, p.body);
  bodyGrad.addColorStop(1, p.dark);

  // alas
  const wing = (dir) => {
    ctx.beginPath();
    ctx.moveTo(dir * 14, -36);
    ctx.lineTo(dir * 106, -14);
    ctx.lineTo(dir * 112, 8);
    ctx.quadraticCurveTo(dir * 100, 24, dir * 74, 26);
    ctx.lineTo(dir * 18, 22);
    ctx.closePath();
    ctx.fillStyle = bodyGrad;
    ctx.fill();
    ctx.strokeStyle = p.dark;
    ctx.lineWidth = 3;
    ctx.stroke();

    // franja del ala
    ctx.save();
    ctx.clip();
    ctx.fillStyle = p.accent;
    ctx.globalAlpha = 0.85;
    ctx.fillRect(dir > 0 ? 62 : -88, -22, 26, 50);
    ctx.restore();

    // ametralladora
    ctx.fillStyle = p.dark;
    ctx.fillRect(dir * 46 - 2, -34, 4, 16);
  };
  wing(-1);
  wing(1);

  // estabilizador de cola
  ctx.beginPath();
  ctx.moveTo(-14, 84);
  ctx.lineTo(-54, 104);
  ctx.lineTo(-50, 116);
  ctx.lineTo(-8, 108);
  ctx.lineTo(8, 108);
  ctx.lineTo(50, 116);
  ctx.lineTo(54, 104);
  ctx.lineTo(14, 84);
  ctx.closePath();
  ctx.fillStyle = bodyGrad;
  ctx.fill();
  ctx.strokeStyle = p.dark;
  ctx.lineWidth = 3;
  ctx.stroke();

  // fuselaje
  ctx.beginPath();
  ctx.ellipse(0, 0, 22, 112, 0, 0, Math.PI * 2);
  ctx.fillStyle = bodyGrad;
  ctx.fill();
  ctx.strokeStyle = p.dark;
  ctx.lineWidth = 3.5;
  ctx.stroke();

  // morro
  const nose = ctx.createRadialGradient(-6, -86, 2, 0, -88, 26);
  nose.addColorStop(0, p.body);
  nose.addColorStop(1, p.shade);
  ctx.beginPath();
  ctx.arc(0, -88, 24, 0, Math.PI * 2);
  ctx.fillStyle = nose;
  ctx.fill();
  ctx.strokeStyle = p.dark;
  ctx.lineWidth = 3;
  ctx.stroke();

  // cubierta / cabina
  const glass = ctx.createLinearGradient(-12, -46, 12, -12);
  glass.addColorStop(0, '#ffffff');
  glass.addColorStop(0.25, p.glass);
  glass.addColorStop(1, '#1c4b6b');
  ctx.beginPath();
  ctx.ellipse(0, -30, 13, 31, 0, 0, Math.PI * 2);
  ctx.fillStyle = glass;
  ctx.fill();
  ctx.strokeStyle = p.dark;
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // líneas de panel
  ctx.strokeStyle = 'rgba(0,0,0,0.22)';
  ctx.lineWidth = 1.5;
  for (const y of [10, 34, 58]) {
    ctx.beginPath();
    ctx.moveTo(-16, y);
    ctx.lineTo(16, y);
    ctx.stroke();
  }

  // insignia en las alas
  for (const dir of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(dir * 76, 6, 13, 0, Math.PI * 2);
    ctx.fillStyle = p.accent;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(dir * 76, 6, 6, 0, Math.PI * 2);
    ctx.fillStyle = p.dark;
    ctx.fill();
  }

  // escape / brillo
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.fillRect(-13, 78, 26, 5);

  return toTexture(canvas);
}

export function makePropTexture(color = 'rgba(240,255,255,0.8)') {
  const { canvas, ctx } = makeCanvas(128, 128);
  ctx.translate(64, 64);

  const disc = ctx.createRadialGradient(0, 0, 4, 0, 0, 60);
  disc.addColorStop(0, 'rgba(255,255,255,0.30)');
  disc.addColorStop(0.7, 'rgba(255,255,255,0.06)');
  disc.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = disc;
  ctx.beginPath();
  ctx.arc(0, 0, 60, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = color;
  for (const dir of [1, -1]) {
    ctx.save();
    ctx.rotate((dir * Math.PI) / 2);
    ctx.beginPath();
    ctx.ellipse(0, -34, 7, 32, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  ctx.beginPath();
  ctx.arc(0, 0, 7, 0, Math.PI * 2);
  ctx.fillStyle = '#e6f4ff';
  ctx.fill();

  return toTexture(canvas);
}

const TEX_CACHE = new Map();

function cached(key, factory) {
  if (!TEX_CACHE.has(key)) {
    const tex = factory();
    tex.__shared = true;
    TEX_CACHE.set(key, tex);
  }
  return TEX_CACHE.get(key);
}

export function planeTexture(kind) {
  return cached(`plane.${kind}`, () => makePlaneTexture(kind));
}

export function propTexture(kind) {
  const color = PLANE_PALETTES[kind]?.prop || PLANE_PALETTES.player.prop;
  return cached(`prop.${kind}`, () => makePropTexture(color));
}

export const shared = {
  glow: () => cached('fx.glow', () => makeGlowTexture()),
  fire: () => cached('fx.fire', () =>
    makeGlowTexture('rgba(255,238,170,1)', 'rgba(255,80,20,0)')
  ),
  fireball: () => cached('fx.fireball', () => makeFireTexture()),
  smoke: () => cached('fx.smoke', () => makeSmokeTexture()),
  shadow: () => cached('fx.shadow', () => makeShadowTexture()),
  cloud: () => cached('fx.cloud', () => makeCloudTexture()),
  water: () => cached('fx.water', () => makeWaterTexture()),
};

/**
 * Avión sprite con sombra, hélice giratoria y luz de alas.
 * El morro apunta hacia arriba (+y).
 */
export function makePlane(kind = 'player', size = 0.21) {
  const group = new THREE.Group();

  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({
      map: shared.shadow(),
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      toneMapped: false,
    })
  );
  shadow.position.set(0.018, -0.024, -0.012);
  shadow.scale.setScalar(size * 1.35);
  group.add(shadow);

  const body = new THREE.Mesh(
    new THREE.PlaneGeometry(size, size),
    new THREE.MeshBasicMaterial({
      map: planeTexture(kind),
      transparent: true,
      depthWrite: false,
      toneMapped: false,
    })
  );
  group.add(body);

  const prop = new THREE.Mesh(
    new THREE.PlaneGeometry(size * 0.44, size * 0.44),
    new THREE.MeshBasicMaterial({
      map: propTexture(kind),
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    })
  );
  prop.position.set(0, size * 0.43, 0.004);
  group.add(prop);

  const navL = new THREE.Mesh(
    new THREE.CircleGeometry(size * 0.045, 8),
    new THREE.MeshBasicMaterial({
      color: 0xff4d6a,
      transparent: true,
      toneMapped: false,
    })
  );
  navL.position.set(-size * 0.47, -size * 0.03, 0.005);
  const navR = navL.clone();
  navR.position.x = size * 0.47;
  navR.material = new THREE.MeshBasicMaterial({
    color: 0x6dffb8,
    transparent: true,
    toneMapped: false,
  });
  group.add(navL, navR);

  group.userData.body = body;
  group.userData.prop = prop;
  group.userData.navL = navL;
  group.userData.navR = navR;
  group.userData.size = size;
  return group;
}

/* ---------------------------------------------------------------- escena */

/**
 * Fondo de mar con scroll vertical: agua, islas, nubes y estelas.
 * Todo vive en el plano de la pantalla, como el fondo de un 1945.
 */
export class ScrollingWorld {
  constructor({ width = 1.4, height = 0.92, z = -1.8, density = 1, scale = 1 } = {}) {
    this.width = width;
    this.height = height;
    this.scale = scale;
    this.group = new THREE.Group();
    this.group.position.z = z;
    this.islands = [];
    this.clouds = [];
    this.foam = [];

    const halfW = width / 2;
    const halfH = height / 2;

    const base = new THREE.Mesh(
      new THREE.PlaneGeometry(width, height),
      new THREE.MeshBasicMaterial({
        map: makeSeaBaseTexture(),
        toneMapped: false,
      })
    );
    this.baseMat = base.material;
    this.group.add(base);

    this.waterTex = shared.water();
    this.waterTex.repeat.set(2.4, 1.6);
    this.waterMat = new THREE.MeshBasicMaterial({
      map: this.waterTex,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      toneMapped: false,
    });
    const water = new THREE.Mesh(new THREE.PlaneGeometry(width, height), this.waterMat);
    water.position.z = 0.001;
    this.group.add(water);

    // islas: siempre dentro del recuadro para que el marco las recorte
    const islandCount = Math.max(2, Math.round(3.2 * density));
    for (let i = 0; i < islandCount; i++) {
      const tex = makeIslandTexture(i);
      const size = (0.2 + Math.random() * 0.13) * scale;
      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(size, size),
        new THREE.MeshBasicMaterial({
          map: tex,
          transparent: true,
          opacity: 1,
          depthWrite: false,
          toneMapped: false,
        })
      );
      const island = {
        mesh,
        size,
        speed: (0.016 + Math.random() * 0.012) * Math.sqrt(scale),
        fade: 0,
        baseOpacity: 1,
      };
      this.placeTop(island);
      mesh.position.y = -halfH + size / 2 + Math.random() * (height - size);
      this.group.add(mesh);
      this.islands.push(island);
    }

    // nubes
    const cloudW = 0.42 * scale;
    const cloudH = 0.26 * scale;
    for (let i = 0; i < Math.round(6 * density); i++) {
      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(cloudW, cloudH),
        new THREE.MeshBasicMaterial({
          map: shared.cloud(),
          transparent: true,
          opacity: 0.32,
          depthWrite: false,
          toneMapped: false,
        })
      );
      const cloud = {
        mesh,
        w: cloudW,
        h: cloudH,
        speed: (0.045 + Math.random() * 0.05) * Math.sqrt(scale),
        fade: 0,
        baseOpacity: 0.12 + Math.random() * 0.22,
      };
      this.placeTop(cloud);
      mesh.position.y = -halfH + cloudH / 2 + Math.random() * (height - cloudH);
      this.group.add(mesh);
      this.clouds.push(cloud);
    }

    // espuma
    const foamGeo = new THREE.PlaneGeometry(0.018, 0.0022);
    for (let i = 0; i < 24; i++) {
      const mesh = new THREE.Mesh(
        foamGeo,
        new THREE.MeshBasicMaterial({
          color: 0xd6f7ff,
          transparent: true,
          opacity: 0.16 + Math.random() * 0.35,
          depthWrite: false,
          toneMapped: false,
        })
      );
      mesh.position.set(
        (Math.random() - 0.5) * (width - 0.03),
        (Math.random() - 0.5) * (height - 0.02),
        0.004
      );
      mesh.userData.speed = 0.09 + Math.random() * 0.15;
      mesh.userData.baseOpacity = mesh.material.opacity;
      this.group.add(mesh);
      this.foam.push(mesh);
    }

    this.halfW = halfW;
    this.halfH = halfH;
  }

  setTint(hex) {
    this.baseMat.color.setHex(hex);
    this.waterMat.color.setHex(hex);
  }

  placeTop(obj) {    const w = obj.w || obj.size;
    const h = obj.h || obj.size;
    const xMax = Math.max(0, this.width / 2 - w / 2 - 0.01);
    obj.mesh.position.x = (Math.random() * 2 - 1) * xMax;
    obj.mesh.position.y = this.height / 2 - h / 2 - 0.01;
    obj.fade = 0;
    obj.mesh.material.opacity = 0;
  }

  update(dt) {
    const halfH = this.halfH;
    const fadeBand = 0.07;

    this.waterTex.offset.y -= dt * 0.055;

    for (const island of this.islands) {
      island.mesh.position.y -= island.speed * dt;
      island.fade = Math.min(1, island.fade + dt * 2.4);
      const bottom = island.mesh.position.y - island.size / 2;
      const edge = THREE.MathUtils.clamp((bottom + halfH) / fadeBand, 0, 1);
      island.mesh.material.opacity = island.baseOpacity * island.fade * edge;
      if (bottom < -halfH) {
        this.placeTop(island);
      }
    }

    for (const cloud of this.clouds) {
      cloud.mesh.position.y -= cloud.speed * dt;
      cloud.fade = Math.min(1, cloud.fade + dt * 1.8);
      const bottom = cloud.mesh.position.y - cloud.h / 2;
      const edge = THREE.MathUtils.clamp((bottom + halfH) / fadeBand, 0, 1);
      cloud.mesh.material.opacity = cloud.baseOpacity * cloud.fade * edge;
      if (bottom < -halfH) {
        this.placeTop(cloud);
      }
    }

    for (const foam of this.foam) {
      foam.position.y -= foam.userData.speed * dt;
      if (foam.position.y < -halfH + 0.01) {
        foam.position.y = halfH - 0.01;
        foam.position.x =
          (Math.random() - 0.5) * (this.width - 0.03);
      }
    }
  }
}

/* -------------------------------------------------------------- carcasa */

/**
 * Marco de recreativa con ventana transparente para ver el mar.
 */
export function makeBezel() {
  const { canvas, ctx } = makeCanvas(1024, 540);
  const W = 1024;
  const H = 540;

  // ventana interior
  const win = { x: 177, y: 44, w: 670, h: 440 };
  const winR = 16;
  const outer = { x: 4, y: 4, w: W - 8, h: H - 8, r: 30 };

  ctx.clearRect(0, 0, W, H);

  // cuerpo: degradado radial para que los bordes se fundan con la escena
  const metal = ctx.createRadialGradient(512, 250, 200, 512, 270, 640);
  metal.addColorStop(0, '#22334a');
  metal.addColorStop(0.55, '#0d1622');
  metal.addColorStop(1, '#05090f');

  ctx.beginPath();
  ctx.roundRect(outer.x, outer.y, outer.w, outer.h, outer.r);
  ctx.roundRect(win.x, win.y, win.w, win.h, winR);
  ctx.fillStyle = metal;
  ctx.fill('evenodd');

  // vetas metálicas
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(outer.x, outer.y, outer.w, outer.h, outer.r);
  ctx.roundRect(win.x, win.y, win.w, win.h, winR);
  ctx.clip('evenodd');
  ctx.strokeStyle = 'rgba(255,255,255,0.035)';
  ctx.lineWidth = 1;
  for (let y = 0; y < H; y += 4) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }
  ctx.restore();

  // filo exterior
  ctx.strokeStyle = 'rgba(77,226,197,0.55)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(outer.x + 1.5, outer.y + 1.5, outer.w - 3, outer.h - 3, outer.r);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(0,0,0,0.8)';
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.roundRect(win.x - 7, win.y - 7, win.w + 14, win.h + 14, winR + 6);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(77,226,197,0.7)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(win.x - 2, win.y - 2, win.w + 4, win.h + 4, winR + 2);
  ctx.stroke();

  // brillo del cristal (diagonal tenue)
  const glass = ctx.createLinearGradient(win.x, win.y, win.x + win.w, win.y + win.h);
  glass.addColorStop(0, 'rgba(180,235,255,0.10)');
  glass.addColorStop(0.35, 'rgba(180,235,255,0.02)');
  glass.addColorStop(0.55, 'rgba(180,235,255,0)');
  glass.addColorStop(1, 'rgba(180,235,255,0.05)');
  ctx.fillStyle = glass;
  ctx.fillRect(win.x, win.y, win.w, win.h);

  // paneles laterales
  const panels = [
    { x: 88, rot: -Math.PI / 2, text: 'LA WEB POR DENTRO' },
    { x: 936, rot: Math.PI / 2, text: 'ARCADE · DAW' },
  ];
  for (const panel of panels) {
    ctx.save();
    ctx.translate(panel.x, 264);
    ctx.rotate(panel.rot);
    ctx.fillStyle = 'rgba(255,180,84,0.75)';
    ctx.font = `800 19px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(panel.text, 0, 0);
    ctx.fillStyle = 'rgba(77,226,197,0.35)';
    ctx.fillRect(-110, 18, 220, 2);
    ctx.restore();

    // emblema
    ctx.beginPath();
    ctx.arc(panel.x, 150, 30, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,180,84,0.55)';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(panel.x, 150, 19, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,180,84,0.3)';
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,180,84,0.8)';
    ctx.font = `800 20px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('45', panel.x, 152);

    // chevrons
    ctx.strokeStyle = 'rgba(77,226,197,0.22)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(panel.x - 22, 380 + i * 24);
      ctx.lineTo(panel.x, 368 + i * 24);
      ctx.lineTo(panel.x + 22, 380 + i * 24);
      ctx.stroke();
    }
  }

  // remaches
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  for (let i = 0; i < 9; i++) {
    const x = 54 + i * ((W - 108) / 8);
    for (const y of [22, H - 22]) {
      ctx.beginPath();
      ctx.arc(x, y, 2.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // luces superiores
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.arc(win.x + 22 + i * 20, 24, 4.5, 0, Math.PI * 2);
    ctx.fillStyle = ['#4ade80', '#ffb454', '#ff5d73'][i];
    ctx.globalAlpha = 0.9;
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.fillStyle = 'rgba(255,180,84,0.75)';
  ctx.font = `800 18px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('E S C U A D R Ó N   W E B   ·   1 9 4 5', 512, 23);

  // banda inferior discreta
  ctx.fillStyle = 'rgba(255,255,255,0.14)';
  ctx.font = `700 13px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText('INSERT COIN   ·   3 VIDAS   ·   MUEVE Y DISPARA', 512, H - 18);

  const tex = toTexture(canvas);
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(2.0, 1.06),
    new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      toneMapped: false,
    })
  );
  mesh.position.set(0, 1.23, -1.76);
  mesh.userData.isLabel = true;
  mesh.raycast = () => {};
  return mesh;
}

/** Barra de estado dentro de la pantalla (score, vidas, progreso). */
export class StatusBar {
  constructor(width = 1.32, height = 0.105) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = 1024;
    this.canvas.height = 70;
    this.ctx = this.canvas.getContext('2d');
    this.texture = toTexture(this.canvas);
    this.mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(width, height),
      new THREE.MeshBasicMaterial({
        map: this.texture,
        transparent: true,
        depthWrite: false,
        toneMapped: false,
      })
    );
    this.state = null;
  }

  update(state) {
    const key = JSON.stringify(state);
    if (key === this.state) return;
    this.state = key;
    this.draw(state);
  }

  draw({ stage, score, lives, question, total, tone }) {
    const { ctx } = this;
    const W = 1024;
    const H = 70;
    const accent = tone || '#4de2c5';
    ctx.clearRect(0, 0, W, H);

    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, 'rgba(3,8,15,0.94)');
    bg.addColorStop(1, 'rgba(3,8,15,0.72)');
    ctx.fillStyle = bg;
    roundRect(ctx, 0, 0, W, H, 8);
    ctx.fill();

    ctx.strokeStyle = accent;
    ctx.globalAlpha = 0.55;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(10, H - 2);
    ctx.lineTo(W - 10, H - 2);
    ctx.stroke();
    ctx.globalAlpha = 1;

    // 1UP + puntos
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffb454';
    ctx.font = `800 12px ${FONT}`;
    ctx.fillText('1UP', 18, 13);

    ctx.fillStyle = '#ffffff';
    ctx.font = `800 27px ui-monospace, "Consolas", monospace`;
    ctx.shadowColor = 'rgba(255,180,84,0.6)';
    ctx.shadowBlur = 9;
    ctx.fillText(String(score).padStart(6, '0'), 16, 42);
    ctx.shadowBlur = 0;

    // separador
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.beginPath();
    ctx.moveTo(236, 12);
    ctx.lineTo(236, H - 12);
    ctx.stroke();

    // sector
    ctx.fillStyle = '#6f8199';
    ctx.font = `700 11px ${FONT}`;
    ctx.fillText('SECTOR', 258, 13);
    ctx.fillStyle = accent;
    ctx.font = `800 20px ${FONT}`;
    ctx.fillText(String(stage).toUpperCase(), 258, 42);

    // vidas
    ctx.fillStyle = '#6f8199';
    ctx.font = `700 11px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText('VIDAS', 742, 13);
    for (let i = 0; i < 3; i++) {
      this.drawPlaneIcon(ctx, 714 + i * 28, 43, i < lives, accent);
    }

    // progreso de preguntas
    ctx.textAlign = 'left';
    ctx.fillStyle = '#6f8199';
    ctx.font = `700 11px ${FONT}`;
    ctx.fillText('PREGUNTAS', 836, 13);
    for (let i = 0; i < total; i++) {
      const x = 836 + i * 27;
      ctx.beginPath();
      ctx.roundRect(x, 31, 20, 16, 3);
      ctx.fillStyle = i < question ? accent : 'rgba(255,255,255,0.16)';
      ctx.fill();
      if (i < question) {
        ctx.fillStyle = 'rgba(0,0,0,0.28)';
        ctx.fillRect(x + 3, 34, 6, 10);
      }
    }

    this.texture.needsUpdate = true;
  }

  drawPlaneIcon(ctx, x, y, on, tone) {
    ctx.save();
    ctx.translate(x, y);
    ctx.globalAlpha = on ? 1 : 0.16;
    ctx.fillStyle = on ? tone || '#4de2c5' : '#8aa0b8';
    ctx.beginPath();
    ctx.moveTo(0, -11);
    ctx.lineTo(3, -2);
    ctx.lineTo(12, 2);
    ctx.lineTo(12, 6);
    ctx.lineTo(2, 5);
    ctx.lineTo(2, 10);
    ctx.lineTo(6, 13);
    ctx.lineTo(6, 15);
    ctx.lineTo(0, 13);
    ctx.lineTo(-6, 15);
    ctx.lineTo(-6, 13);
    ctx.lineTo(-2, 10);
    ctx.lineTo(-2, 5);
    ctx.lineTo(-12, 6);
    ctx.lineTo(-12, 2);
    ctx.lineTo(-3, -2);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}
