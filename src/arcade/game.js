import * as THREE from 'three';
import {
  COLORS,
  disposeObject,
  makeButton,
  makeCard,
  sfx,
} from '../util.js';
import { SECTORS, QUESTIONS_PER_SECTOR } from './questions.js';

/* --------------------------------------------------------------- constantes */

const LANES = [-0.46, 0, 0.46];
const LANE_COLORS = ['#ff6b81', '#ffb454', '#a78bfa'];

const SPAWN_Y = 1.66;
const LINE_Y = 1.065;
const SHIP_Y = 0.955;
const SHIP_Z = -1.42;
const TARGET_Z = -1.5;
const BULLET_Z = -1.43;
const BULLET_SPEED = 2.9;
const FIRE_COOLDOWN = 0.17;
const SHIP_RANGE = 0.6;

const MAX_LIVES = 3;

/* ------------------------------------------------------------------ utils */

function shuffle(list) {
  const out = list.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function shuffleQuestion(source) {
  const order = shuffle(source.options.map((_, i) => i));
  return {
    text: source.q,
    options: order.map((i) => source.options[i]),
    correct: order.indexOf(source.correct),
    why: source.why,
  };
}

/** Avión procedural: morro hacia abajo (el jugador lo gira 180°). */
function makeAircraft(color) {
  const group = new THREE.Group();
  const body = new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 0.35,
    roughness: 0.35,
    metalness: 0.55,
  });
  const dark = new THREE.MeshStandardMaterial({
    color: 0x0b1523,
    roughness: 0.5,
    metalness: 0.6,
  });
  const glass = new THREE.MeshStandardMaterial({
    color: 0x9fd8ff,
    emissive: 0x1d5f8a,
    emissiveIntensity: 0.7,
    roughness: 0.15,
    metalness: 0.9,
  });

  const fuselage = new THREE.Mesh(new THREE.CapsuleGeometry(0.016, 0.085, 3, 8), body);
  group.add(fuselage);

  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.016, 0.035, 10), body);
  nose.position.y = -0.068;
  nose.rotation.z = Math.PI;
  group.add(nose);

  const wings = new THREE.Mesh(new THREE.BoxGeometry(0.175, 0.024, 0.014), body);
  wings.position.y = 0.004;
  group.add(wings);

  const wingTipL = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.012, 0.012), dark);
  wingTipL.position.set(-0.088, 0.004, 0);
  group.add(wingTipL);
  const wingTipR = wingTipL.clone();
  wingTipR.position.x = 0.088;
  group.add(wingTipR);

  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.018, 0.01), body);
  tail.position.y = 0.052;
  group.add(tail);

  const cockpit = new THREE.Mesh(new THREE.SphereGeometry(0.014, 12, 8), glass);
  cockpit.position.set(0, -0.008, 0.012);
  cockpit.scale.y = 1.5;
  group.add(cockpit);

  const engine = new THREE.Mesh(
    new THREE.SphereGeometry(0.009, 10, 8),
    new THREE.MeshBasicMaterial({
      color: 0xffd479,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    })
  );
  engine.position.y = 0.072;
  group.add(engine);
  group.userData.engine = engine;

  return group;
}

/** Pantalla holográfica de fondo. */
function makeScreenFrame() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 540;
  const ctx = canvas.getContext('2d');

  const grad = ctx.createLinearGradient(0, 0, 0, 540);
  grad.addColorStop(0, 'rgba(10,18,32,0.94)');
  grad.addColorStop(1, 'rgba(5,9,17,0.97)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1024, 540);

  ctx.strokeStyle = 'rgba(77,226,197,0.10)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= 1024; x += 64) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 540);
    ctx.stroke();
  }
  for (let y = 0; y <= 540; y += 64) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(1024, y);
    ctx.stroke();
  }

  // scanlines
  ctx.fillStyle = 'rgba(255,255,255,0.018)';
  for (let y = 0; y < 540; y += 4) ctx.fillRect(0, y, 1024, 1);

  // marco
  ctx.strokeStyle = 'rgba(77,226,197,0.55)';
  ctx.lineWidth = 6;
  ctx.strokeRect(8, 8, 1008, 524);
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 2;
  ctx.strokeRect(20, 20, 984, 500);

  // esquinas
  ctx.strokeStyle = '#4de2c5';
  ctx.lineWidth = 8;
  const corner = 46;
  const corners = [
    [26, 26, 1, 1],
    [998, 26, -1, 1],
    [26, 514, 1, -1],
    [998, 514, -1, -1],
  ];
  for (const [x, y, sx, sy] of corners) {
    ctx.beginPath();
    ctx.moveTo(x + sx * corner, y);
    ctx.lineTo(x, y);
    ctx.lineTo(x, y + sy * corner);
    ctx.stroke();
  }

  // zona de peligro inferior
  const danger = ctx.createLinearGradient(0, 470, 0, 540);
  danger.addColorStop(0, 'rgba(255,93,115,0)');
  danger.addColorStop(1, 'rgba(255,93,115,0.22)');
  ctx.fillStyle = danger;
  ctx.fillRect(20, 470, 984, 50);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;

  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(1.98, 1.02),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false })
  );
  mesh.position.set(0, 1.22, -1.74);
  mesh.userData.isLabel = true;
  mesh.raycast = () => {};
  return mesh;
}

/** Estelas verticales para dar sensación de velocidad. */
function makeStreaks() {
  const group = new THREE.Group();
  const material = new THREE.MeshBasicMaterial({
    color: 0x5f8fbf,
    transparent: true,
    opacity: 0.35,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });
  const geometry = new THREE.PlaneGeometry(0.004, 0.05);
  const items = [];

  for (let i = 0; i < 34; i++) {
    const streak = new THREE.Mesh(geometry, material);
    streak.position.set(
      (Math.random() - 0.5) * 1.85,
      0.75 + Math.random() * 1.05,
      -1.68
    );
    streak.userData.speed = 0.12 + Math.random() * 0.35;
    group.add(streak);
    items.push(streak);
  }

  group.userData.items = items;
  group.userData.reset = (streak) => {
    streak.position.y = 1.8;
    streak.position.x = (Math.random() - 0.5) * 1.85;
    streak.userData.speed = 0.12 + Math.random() * 0.35;
  };
  group.userData.material = material;
  group.userData.geometry = geometry;
  return group;
}

/* ------------------------------------------------------------------ juego */

export class Arcade {
  constructor(api, opts = {}) {
    this.api = api;
    this.practiceSector =
      typeof opts.sector === 'number' ? opts.sector : null;

    this.group = new THREE.Group();
    this.world = new THREE.Group();
    this.bulletLayer = new THREE.Group();
    this.targetLayer = new THREE.Group();
    this.fxLayer = new THREE.Group();

    this.group.add(makeScreenFrame());

    this.streaks = makeStreaks();
    this.group.add(this.streaks);

    this.world.add(this.bulletLayer, this.targetLayer, this.fxLayer);
    this.group.add(this.world);

    this.ship = makeAircraft(COLORS.accent);
    this.ship.rotation.z = Math.PI;
    this.ship.position.set(0, SHIP_Y, SHIP_Z);
    this.ship.scale.setScalar(1.15);
    this.world.add(this.ship);

    this.shipGlow = new THREE.PointLight(COLORS.accent, 0.9, 0.45, 2);
    this.shipGlow.position.set(0, SHIP_Y, SHIP_Z + 0.1);
    this.world.add(this.shipGlow);

    this.targetX = 0;
    this.firing = false;
    this.cooldown = 0;
    this.bullets = [];
    this.targets = [];
    this.effects = [];
    this.shake = 0;

    this.lives = MAX_LIVES;
    this.score = 0;
    this.combo = 0;
    this.qIndex = 0;
    this.current = null;
    this.queue = [];
    this.state = 'intro';

    this.sectorsDone = 0;
    this.order =
      this.practiceSector === null
        ? SECTORS.map((_, i) => i)
        : [this.practiceSector];
    this.sectorPos = 0;

    api.tick((dt, t) => this.update(dt, t));
    this.beginSector();
  }

  /* --------------------------------------------------------------- estado */

  get sector() {
    return SECTORS[this.order[this.sectorPos]];
  }

  get isPractice() {
    return this.practiceSector !== null;
  }

  isPlaying() {
    return this.state === 'playing';
  }

  statusLine() {
    return `Vidas ${this.lives}  ·  ${this.score} pts  ·  pregunta ${Math.min(
      this.qIndex + 1,
      this.queue.length
    )}/${this.queue.length}`;
  }

  header() {
    if (this.isPractice) return `PRÁCTICA · ${this.sector.title.toUpperCase()}`;
    return `SECTOR ${this.sectorPos + 1}/${this.order.length} · ${this.sector.title.toUpperCase()}`;
  }

  /* --------------------------------------------------------------- flujo */

  beginSector() {
    const sector = this.sector;
    this.qIndex = 0;
    this.queue = shuffle(sector.questions)
      .slice(0, QUESTIONS_PER_SECTOR)
      .map(shuffleQuestion);
    this.state = 'intro';
    this.clearTargets();

    this.api.setHud(
      this.header(),
      sector.brief,
      `${this.statusLine()}  ·  sector ${this.sectorPos + 1} de ${this.order.length}`,
      sector.tone
    );

    this.api.after(1900, () => this.nextQuestion());
  }

  nextQuestion() {
    if (this.qIndex >= this.queue.length) {
      this.sectorClear();
      return;
    }

    this.current = this.queue[this.qIndex];
    this.state = 'playing';
    this.clearTargets();
    this.api.setHud(
      this.header(),
      this.current.text,
      this.statusLine(),
      this.sector.tone
    );
    this.spawnWave();
  }

  spawnWave() {
    const picks = shuffle([0, 1, 2]);
    picks.forEach((lane, i) => {
      const isCorrect = i === this.current.correct;
      const color = LANE_COLORS[lane];
      const aircraft = makeAircraft(
        new THREE.Color(color).getHex()
      );
      aircraft.position.set(LANES[lane], SPAWN_Y, TARGET_Z);

      const label = makeCard({
        w: 0.36,
        h: 0.072,
        title: this.current.options[i],
        align: 'center',
        tone: color,
        titleColor: '#f2f7fb',
        bg: 'rgba(12,18,30,0.94)',
        border: 'rgba(255,255,255,0.12)',
      });
      label.position.set(0, -0.082, 0.012);
      aircraft.add(label);

      const target = {
        group: aircraft,
        x: LANES[lane],
        y: SPAWN_Y,
        speed: 0.062 + this.sectorPos * 0.013,
        correct: isCorrect,
        alive: true,
      };
      aircraft.userData.target = target;
      aircraft.traverse((node) => {
        node.userData.target = target;
      });

      this.targetLayer.add(aircraft);
      this.targets.push(target);
    });
  }

  /* --------------------------------------------------------------- disparo */

  setFiring(on) {
    if (on && !this.firing) this.fire();
    this.firing = on;
  }

  fire() {
    if (this.state !== 'playing') return;
    if (this.cooldown > 0) return;
    this.cooldown = FIRE_COOLDOWN;

    const bullet = new THREE.Mesh(
      new THREE.BoxGeometry(0.011, 0.05, 0.011),
      new THREE.MeshBasicMaterial({ color: 0xffe08a, toneMapped: false })
    );
    bullet.position.set(this.ship.position.x, SHIP_Y + 0.06, BULLET_Z);
    this.bulletLayer.add(bullet);
    this.bullets.push({ mesh: bullet, x: bullet.position.x, y: bullet.position.y });
    this.shipGlow.intensity = 3;

    sfx.click();
    this.addEffect(this.smallFlash(bullet.position.x, SHIP_Y + 0.08, 0xffe08a));
  }

  pointerMove(nx) {
    this.targetX = THREE.MathUtils.clamp(nx, -1, 1) * SHIP_RANGE;
  }

  nudge(dir) {
    this.targetX = THREE.MathUtils.clamp(
      this.targetX + dir * 0.14,
      -SHIP_RANGE,
      SHIP_RANGE
    );
  }

  /** Disparo en VR: apunta con el mando y pulsa el gatillo. */
  handleXR(origin, direction) {
    if (this.state !== 'playing') return false;

    const ray = new THREE.Ray(origin.clone(), direction.clone().normalize());
    const point = new THREE.Vector3();
    let best = null;
    let bestDist = Infinity;

    for (const target of this.targets) {
      if (!target.alive) continue;
      point.set(target.x, target.y, TARGET_Z);
      const ahead = point.clone().sub(origin).dot(ray.direction);
      if (ahead <= 0) continue;
      const dist = ray.distanceSqToPoint(point);
      if (dist < 0.02 && dist < bestDist) {
        bestDist = dist;
        best = target;
      }
    }

    if (best) {
      this.addEffect(
        this.tracer(origin, new THREE.Vector3(best.x, best.y, TARGET_Z), COLORS.accent)
      );
      this.hitTarget(best);
      return true;
    }

    // Disparo al aire: sale una bala desde el avión.
    this.cooldown = 0;
    this.fire();
    return true;
  }

  /* ------------------------------------------------------------ colisiones */

  hitTarget(target) {
    if (!target.alive) return;
    target.alive = false;

    const isCorrect = target.correct;
    this.removeTarget(target);
    this.addEffect(
      this.explosion(
        target.x,
        target.y,
        isCorrect ? COLORS.ok : COLORS.danger,
        isCorrect ? 1.25 : 0.9
      )
    );

    if (isCorrect) {
      this.combo += 1;
      const gain = 100 + (this.combo - 1) * 25;
      this.score += gain;
      this.qIndex += 1;
      this.state = 'feedback';
      sfx.ok();

      this.api.ok(
        `¡Derribado! ${this.current.why}  +${gain} pts`,
        this.statusLine()
      );

      this.clearTargets(0.45);
      this.api.after(1550, () => {
        if (this.qIndex >= this.queue.length) this.sectorClear();
        else this.nextQuestion();
      });
    } else {
      this.failShot(
        '¡Ese no era!',
        `La respuesta correcta era «${this.current.options[this.current.correct]}».`
      );
    }
  }

  failShot(title, detail) {
    if (this.state !== 'playing') return;
    this.state = 'feedback';
    this.lives -= 1;
    this.combo = 0;
    this.shake = 0.045;
    sfx.err();

    this.api.err(`${title} ${detail}  ${this.current.why}`, this.statusLine());

    this.clearTargets(0.4);

    if (this.lives <= 0) {
      this.api.after(1500, () => this.gameOver());
    } else {
      this.api.after(1750, () => this.nextQuestion());
    }
  }

  missAnswer() {
    if (this.state !== 'playing') return;
    this.failShot(
      'Se escapó la respuesta correcta.',
      `Era «${this.current.options[this.current.correct]}».`
    );
  }

  /* ---------------------------------------------------------------- sectores */

  sectorClear() {
    if (this.state === 'clear' || this.state === 'victory') return;
    this.state = 'clear';
    this.lives = Math.min(MAX_LIVES, this.lives + 1);
    this.score += 250;
    this.sectorsDone += 1;

    this.api.ok(
      `Sector ${this.sectorPos + 1} despejado. +250 pts y una vida extra.`,
      this.statusLine()
    );

    sfx.win();

    this.api.after(2100, () => {
      this.sectorPos += 1;
      if (this.sectorPos >= this.order.length) this.victory();
      else this.beginSector();
    });
  }

  gameOver() {
    this.state = 'gameover';
    this.firing = false;
    this.clearTargets();
    this.api.submitScore(this.score, this.sectorsDone);
    this.api.setHud(
      'FIN DE LA PARTIDA',
      `El escuadrón ha caído con ${this.score} puntos. La respuesta correcta siempre estaba a la vista: vuelve a intentarlo.`,
      `Récord personal: ${this.api.best} pts`,
      '#ff5d73'
    );
    this.showResult(false);
  }

  victory() {
    this.state = 'victory';
    this.firing = false;
    this.clearTargets();
    this.api.submitScore(this.score, this.sectorsDone);
    this.api.setHud(
      'MISIÓN CUMPLIDA',
      `Los cinco sectores están despejados. ${this.score} puntos y ${this.lives} vida(s) de reserva.`,
      `Récord personal: ${this.api.best} pts`,
      '#4ade80'
    );
    this.showResult(true);
  }

  showResult(win) {
    const panel = makeCard({
      w: 0.78,
      h: 0.36,
      title: win ? '✔ CAMPAÑA COMPLETADA' : '✘ ESCUADRÓN DERRIBADO',
      sub: this.isPractice
        ? `Práctica de ${this.sector.title}`
        : `${this.sectorsDone} de ${this.order.length} sectores despejados`,
      foot: `${this.score} PUNTOS  ·  RÉCORD ${this.api.best}`,
      align: 'center',
      tone: win ? '#4ade80' : '#ff5d73',
      bg: 'rgba(8,14,24,0.97)',
      border: 'rgba(255,255,255,0.16)',
    });
    panel.position.set(0, 1.36, -1.5);
    this.group.add(panel);

    const again = makeButton('REINTENTAR', { w: 0.24, h: 0.072 });
    again.position.set(-0.13, 1.11, -1.4);
    again.userData.onSelect = () =>
      this.api.startGame({ sector: this.practiceSector });
    this.group.add(again);

    const menu = makeButton('MENÚ', {
      w: 0.18,
      h: 0.072,
      color: '#93a7bd',
    });
    menu.position.set(0.16, 1.11, -1.4);
    menu.userData.onSelect = () => this.api.showMenu();
    this.group.add(menu);
  }

  /* ------------------------------------------------------------------ vida */

  clearTargets(explodeDelay = 0) {
    const list = this.targets;
    this.targets = [];

    for (const target of list) {
      if (!target.alive) continue;
      target.alive = false;
      const position = { x: target.x, y: target.y };
      this.removeTarget(target, explodeDelay > 0 ? explodeDelay : 0);
      if (explodeDelay > 0) {
        this.addEffect(
          this.explosion(position.x, position.y, 0xffb454, 0.6, explodeDelay)
        );
      }
    }
  }

  removeTarget(target, delay = 0) {
    if (!target.group) return;
    const node = target.group;
    target.group = null;
    if (delay > 0) {
      // pequeña demora visual antes de retirar el avión
      this.api.after(delay * 1000, () => {
        this.targetLayer.remove(node);
        disposeObject(node);
      });
    } else {
      this.targetLayer.remove(node);
      disposeObject(node);
    }
  }

  /* --------------------------------------------------------------- efectos */

  smallFlash(x, y, color) {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.016, 8, 6),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      })
    );
    mesh.position.set(x, y, BULLET_Z);
    return { mesh, life: 0.12, kind: 'flash' };
  }

  explosion(x, y, color, scale = 1, delay = 0) {
    const mesh = new THREE.Mesh(
      new THREE.RingGeometry(0.03, 0.045, 32),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      })
    );
    mesh.position.set(x, y, TARGET_Z + 0.02);
    return {
      mesh,
      life: 0.55,
      t: -delay,
      kind: 'ring',
      scale,
    };
  }

  tracer(origin, to, color) {
    const geometry = new THREE.BufferGeometry().setFromPoints([origin, to]);
    const mesh = new THREE.Line(
      geometry,
      new THREE.LineBasicMaterial({
        color,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      })
    );
    return { mesh, life: 0.18, kind: 'tracer' };
  }

  addEffect(effect) {
    if (!effect) return;
    this.fxLayer.add(effect.mesh);
    this.effects.push(effect);
  }

  /* ------------------------------------------------------------------ loop */

  update(dt, t) {
    this.cooldown = Math.max(0, this.cooldown - dt);
    this.shipGlow.intensity += (1.4 - this.shipGlow.intensity) * Math.min(1, dt * 8);

    // nave
    const shipX = this.ship.position.x;
    this.ship.position.x +=
      (this.targetX - shipX) * Math.min(1, dt * 11);
    this.ship.position.y = SHIP_Y + Math.sin(t * 3.2) * 0.004;
    this.ship.rotation.z = Math.PI + (this.targetX - this.ship.position.x) * 0.5;
    this.shipGlow.position.x = this.ship.position.x;

    const engine = this.ship.userData.engine;
    if (engine) engine.scale.setScalar(0.85 + Math.random() * 0.5);

    // disparo continuo
    if (this.firing && this.state === 'playing') this.fire();

    if (this.shake > 0) {
      this.world.position.x = (Math.random() - 0.5) * this.shake * 2;
      this.world.position.y = (Math.random() - 0.5) * this.shake * 2;
      this.shake = Math.max(0, this.shake - dt * 0.35);
      if (this.shake <= 0.0005) this.world.position.set(0, 0, 0);
    }

    // estelas
    for (const streak of this.streaks.userData.items) {
      streak.position.y -= streak.userData.speed * dt;
      if (streak.position.y < 0.7) this.streaks.userData.reset(streak);
    }

    // balas
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const bullet = this.bullets[i];
      bullet.y += BULLET_SPEED * dt;
      bullet.mesh.position.y = bullet.y;

      let consumed = false;
      for (const target of this.targets) {
        if (!target.alive) continue;
        if (
          Math.abs(bullet.x - target.x) < 0.185 &&
          Math.abs(bullet.y - target.y) < 0.088
        ) {
          consumed = true;
          this.bulletLayer.remove(bullet.mesh);
          disposeObject(bullet.mesh);
          this.bullets.splice(i, 1);
          this.hitTarget(target);
          break;
        }
      }

      if (consumed) continue;
      if (bullet.y > 1.8) {
        this.bulletLayer.remove(bullet.mesh);
        disposeObject(bullet.mesh);
        this.bullets.splice(i, 1);
      }
    }

    // aviones enemigos
    if (this.state === 'playing') {
      for (const target of this.targets) {
        if (!target.alive) continue;
        target.y -= target.speed * dt;
        target.group.position.y = target.y;
        target.group.rotation.z = Math.sin(t * 2 + target.x * 6) * 0.06;

        if (target.y < LINE_Y) {
          if (target.correct) {
            this.missAnswer();
            break;
          }
          target.alive = false;
          this.addEffect(this.explosion(target.x, LINE_Y - 0.02, 0x334155, 0.5));
          this.removeTarget(target);
        }
      }
    }

    // efectos
    for (let i = this.effects.length - 1; i >= 0; i--) {
      const effect = this.effects[i];
      effect.t = (effect.t || 0) + dt;
      if (effect.t < 0) continue;

      const k = Math.min(1, effect.t / effect.life);
      effect.mesh.visible = true;

      if (effect.kind === 'ring') {
        const s = 1 + k * 8 * (effect.scale || 1);
        effect.mesh.scale.setScalar(s);
        effect.mesh.material.opacity = 0.85 * (1 - k);
      } else if (effect.kind === 'tracer') {
        effect.mesh.material.opacity = 0.9 * (1 - k);
      } else {
        effect.mesh.scale.setScalar(1 + k * 3);
        effect.mesh.material.opacity = 0.9 * (1 - k);
      }

      if (k >= 1) {
        this.fxLayer.remove(effect.mesh);
        disposeObject(effect.mesh);
        this.effects.splice(i, 1);
      }
    }
  }
}

export function buildArcade(api, opts) {
  return new Arcade(api, opts);
}
