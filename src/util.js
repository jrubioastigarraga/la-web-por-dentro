import * as THREE from 'three';

export const COLORS = {
  bg: 0x070b14,
  accent: 0x4de2c5,
  accent2: 0xffb454,
  ok: 0x4ade80,
  danger: 0xff5d73,
  purple: 0xa78bfa,
  blue: 0x60a5fa,
  panel: 0x101a2b,
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

function canvas2d(w, h) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  return { canvas, ctx: canvas.getContext('2d') };
}

export function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function fitFont(ctx, text, maxWidth, px, weight) {
  let size = Math.max(8, Math.round(px));
  ctx.font = `${weight} ${size}px ${FONT}`;
  while (ctx.measureText(text).width > maxWidth && size > 8) {
    size -= 1;
    ctx.font = `${weight} ${size}px ${FONT}`;
  }
  return size;
}

/**
 * Etiqueta de texto flotante (sprite). Siempre mira a la cámara,
 * así que es legible tanto en escritorio como dentro del visor.
 */
export function makeText(text, opts = {}) {
  const {
    size = 64,
    color = '#eaf2f7',
    weight = 700,
    height = 0.036,
    bg = null,
    pad = 20,
    radius = 14,
    tone = null,
  } = opts;

  const lines = String(text).split('\n');
  const probe = canvas2d(8, 8).ctx;
  const font = `${weight} ${size}px ${FONT}`;
  probe.font = font;

  let maxW = 0;
  for (const line of lines) maxW = Math.max(maxW, probe.measureText(line).width);

  const lineH = Math.round(size * 1.22);
  const { canvas, ctx } = canvas2d(
    Math.ceil(maxW + pad * 2 + (tone ? 12 : 0)),
    Math.ceil(lineH * lines.length + pad * 2)
  );

  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  if (bg) {
    ctx.fillStyle = bg;
    roundRect(ctx, 1, 1, canvas.width - 2, canvas.height - 2, radius);
    ctx.fill();
  }
  if (tone) {
    ctx.fillStyle = tone;
    roundRect(ctx, 1, 1, 7, canvas.height - 2, 4);
    ctx.fill();
  }

  ctx.fillStyle = color;
  lines.forEach((line, i) => {
    ctx.fillText(line, canvas.width / 2 + (tone ? 4 : 0), pad + lineH * (i + 0.5));
  });

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;

  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: tex,
      transparent: true,
      depthWrite: false,
      toneMapped: false,
    })
  );

  // 'height' es la altura de una línea en metros; la escala total
  // mantiene la proporción real del lienzo.
  const totalH = height * (canvas.height / lineH);
  sprite.scale.set(totalH * (canvas.width / canvas.height), totalH, 1);
  sprite.userData.isLabel = true;
  sprite.raycast = () => {};
  return sprite;
}

/**
 * Panel de interfaz con texto. Se usa para las tarjetas del hub,
 * las filas de las tablas y los campos del formulario.
 */
export function makeCard(opts = {}) {
  const {
    w = 0.32,
    h = 0.09,
    title = '',
    sub = '',
    foot = '',
    tone = '#4de2c5',
    bg = 'rgba(11,18,30,0.94)',
    border = 'rgba(255,255,255,0.10)',
    align = 'left',
    titleColor = '#eaf2f7',
    subColor = '#93a7bd',
    footColor = '#6f8199',
  } = opts;

  const W = 512;
  const H = Math.max(96, Math.round((W * h) / w));
  const { canvas, ctx } = canvas2d(W, H);

  ctx.fillStyle = bg;
  roundRect(ctx, 2, 2, W - 4, H - 4, Math.min(30, H * 0.16));
  ctx.fill();
  ctx.strokeStyle = border;
  ctx.lineWidth = 2;
  ctx.stroke();

  if (tone) {
    ctx.fillStyle = tone;
    roundRect(ctx, 2, 2, 8, H - 4, 5);
    ctx.fill();
  }

  const x = align === 'center' ? W / 2 : 34;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';

  const titlePx = Math.round(H * (sub || foot ? 0.3 : 0.4));
  ctx.fillStyle = titleColor;
  fitFont(ctx, title, W - (align === 'center' ? 60 : 70), titlePx, 700);
  ctx.fillText(title, x, H * (sub || foot ? 0.34 : 0.5));

  if (sub) {
    ctx.fillStyle = subColor;
    fitFont(ctx, sub, W - (align === 'center' ? 60 : 70), Math.round(H * 0.15), 500);
    ctx.fillText(sub, x, H * 0.63);
  }

  if (foot) {
    ctx.fillStyle = footColor;
    fitFont(ctx, foot, W - (align === 'center' ? 60 : 70), Math.round(H * 0.13), 700);
    ctx.fillText(foot, x, H * 0.83);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;

  return new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false })
  );
}

export function makeButton(label, opts = {}) {
  const { w = 0.3, h = 0.095, color = '#4de2c5', bg = 'rgba(8,14,24,0.9)' } = opts;
  const W = 512;
  const H = Math.max(96, Math.round((W * h) / w));
  const { canvas, ctx } = canvas2d(W, H);

  ctx.fillStyle = bg;
  roundRect(ctx, 3, 3, W - 6, H - 6, H * 0.32);
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 5;
  roundRect(ctx, 3, 3, W - 6, H - 6, H * 0.32);
  ctx.stroke();

  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  fitFont(ctx, label, W - 60, Math.round(H * 0.44), 700);
  ctx.fillText(label, W / 2, H / 2 + 2);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;

  return new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false })
  );
}

/** Orbe clicable con etiqueta. La etiqueta se coloca encima. */
export function makeOrb(label, opts = {}) {
  const { color = COLORS.accent, radius = 0.058, height = 0.026 } = opts;

  const group = new THREE.Group();

  const ball = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 32, 24),
    new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.5,
      roughness: 0.3,
      metalness: 0.15,
    })
  );
  group.add(ball);

  const halo = new THREE.Mesh(
    new THREE.RingGeometry(radius * 1.45, radius * 1.7, 48),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.42,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  halo.rotation.x = -Math.PI / 2;
  halo.position.y = -radius - 0.012;
  group.add(halo);

  let tag = null;
  if (label) {
    tag = makeText(label, {
      height,
      color: '#dbe7f5',
      bg: 'rgba(7,12,20,0.82)',
      pad: 14,
      radius: 10,
    });
    tag.center.set(0.5, 0);
    tag.position.y = radius + 0.025;
    group.add(tag);
  }

  group.userData.ball = ball;
  group.userData.halo = halo;
  group.userData.tag = tag;
  return group;
}

export function tintOrb(orb, hex) {
  const { ball, halo } = orb.userData;
  ball.material.color.setHex(hex);
  ball.material.emissive.setHex(hex);
  halo.material.color.setHex(hex);
}

/** Halo suave para dar profundidad detrás de los dioramas. */
export function makeGlow(color = '#4de2c5', size = 2.4, opacity = 0.4) {
  const { canvas, ctx } = canvas2d(256, 256);
  const grad = ctx.createRadialGradient(128, 128, 4, 128, 128, 128);
  grad.addColorStop(0, color);
  grad.addColorStop(0.28, `${color}77`);
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;

  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(size, size),
    new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      opacity,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    })
  );
  mesh.userData.isLabel = true;
  mesh.raycast = () => {};
  return mesh;
}

export function disposeObject(root) {
  root.traverse((obj) => {
    if (obj.geometry) obj.geometry.dispose();
    if (!obj.material) return;
    const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
    for (const mat of materials) {
      for (const key of ['map', 'alphaMap', 'emissiveMap']) {
        if (mat[key] && !mat[key].__shared) mat[key].dispose();
      }
      mat.dispose();
    }
  });
}

/* ---------------------------------------------------------------- audio */

let audio = null;

export function initAudio() {
  if (!audio) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    try {
      audio = new Ctx();
    } catch {
      return;
    }
  }
  if (audio.state === 'suspended') audio.resume();
}

export function beep(freq = 620, dur = 0.08, type = 'sine', gain = 0.045) {
  if (!audio) return;
  const osc = audio.createOscillator();
  const amp = audio.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  amp.gain.setValueAtTime(gain, audio.currentTime);
  amp.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + dur);
  osc.connect(amp);
  amp.connect(audio.destination);
  osc.start();
  osc.stop(audio.currentTime + dur);
}

let noiseBuffer = null;

function getNoise(ctx) {
  if (noiseBuffer && noiseBuffer.sampleRate === ctx.sampleRate) return noiseBuffer;
  const length = Math.floor(ctx.sampleRate * 0.7);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 1.6);
  }
  noiseBuffer = buffer;
  return buffer;
}

export function noiseBurst(dur = 0.3, gain = 0.06, cutoff = 900, type = 'lowpass') {
  if (!audio) return;
  const src = audio.createBufferSource();
  src.buffer = getNoise(audio);

  const filter = audio.createBiquadFilter();
  filter.type = type;
  filter.frequency.value = cutoff;

  const amp = audio.createGain();
  amp.gain.setValueAtTime(gain, audio.currentTime);
  amp.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + dur);

  src.connect(filter);
  filter.connect(amp);
  amp.connect(audio.destination);
  src.start();
  src.stop(audio.currentTime + dur);
}

export const sfx = {
  click: () => beep(540, 0.055, 'triangle', 0.035),
  shot: () => {
    beep(1300, 0.035, 'square', 0.012);
    noiseBurst(0.05, 0.012, 3200, 'highpass');
  },
  boom: () => {
    noiseBurst(0.5, 0.085, 700);
    beep(64, 0.32, 'sine', 0.07);
  },
  stage: () => {
    [523, 659, 784].forEach((f, i) =>
      setTimeout(() => beep(f, 0.16, 'triangle', 0.04), i * 90)
    );
  },
  ok: () => {
    beep(680, 0.1, 'sine', 0.05);
    setTimeout(() => beep(1020, 0.14, 'sine', 0.045), 95);
  },
  err: () => beep(140, 0.2, 'sawtooth', 0.04),
  win: () => {
    [523, 659, 784, 1046].forEach((f, i) =>
      setTimeout(() => beep(f, 0.2, 'sine', 0.045), i * 115)
    );
  },
};
