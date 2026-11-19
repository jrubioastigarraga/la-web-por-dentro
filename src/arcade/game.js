import * as THREE from 'three';
import {
  COLORS,
  disposeObject,
  makeButton,
  makeCard,
  makeText,
  sfx,
} from '../util.js';
import { SECTORS, QUESTIONS_PER_SECTOR } from './questions.js';
import {
  ScrollingWorld,
  GamePanel,
  makeBezel,
  makeDangerTexture,
  makePlane,
  makeVignetteTexture,
  shared,
} from './art.js';

/* --------------------------------------------------------------- constantes */

const LANES = [-0.4, 0, 0.4];
const ENEMY_KINDS = ['red', 'amber', 'purple'];

const SPAWN_Y = 1.38;
const LINE_Y = 1.13;
const SHIP_Y = 1.005;
const SHIP_Z = -1.44;
const TARGET_Z = -1.52;
const BULLET_Z = -1.435;
const BULLET_SPEED = 2.6;
const FIRE_COOLDOWN = 0.15;
const SHIP_RANGE = 0.5;

const MAX_LIVES = 3;

// ambiente del mar por sector: día, atardecer, crepúsculo, frío, amanecer
const SEA_MOODS = [0xffffff, 0xffd7a6, 0xc7c0ff, 0xb6ddff, 0xffd2e4];

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

/** Libera geometrías y materiales sin tocar texturas compartidas. */
function disposeSoft(root) {
  root.traverse((obj) => {
    if (obj.geometry) obj.geometry.dispose();
    if (!obj.material) return;
    const list = Array.isArray(obj.material) ? obj.material : [obj.material];
    for (const mat of list) {
      if (mat.map && !mat.map.__shared) mat.map.dispose();
      mat.dispose();
    }
  });
}

const easeOut = (k) => 1 - Math.pow(1 - k, 3);

/* ------------------------------------------------------------ partículas */

class Fx {
  constructor(layer) {
    this.layer = layer;
    this.items = [];
  }

  add(mesh, opts = {}) {
    const base = mesh.scale.clone();
    this.layer.add(mesh);
    this.items.push({
      mesh,
      base,
      t: -((opts.delay || 0)),
      life: opts.life ?? 0.5,
      vx: opts.vx || 0,
      vy: opts.vy || 0,
      gravity: opts.gravity || 0,
      drag: opts.drag || 0,
      scale0: opts.scale0 ?? 1,
      scale1: opts.scale1 ?? 1,
      opacity0: opts.opacity0 ?? 1,
      opacity1: opts.opacity1 ?? 0,
      spin: opts.spin || 0,
      ease: opts.ease || easeOut,
      visibleDelay: (opts.delay || 0) > 0,
    });
  }

  update(dt) {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const p = this.items[i];
      p.t += dt;
      if (p.t < 0) {
        p.mesh.visible = false;
        continue;
      }
      p.mesh.visible = true;

      const k = Math.min(1, p.t / p.life);
      const e = p.ease(k);

      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y += p.vy * dt;
      p.vy -= p.gravity * dt;
      if (p.drag) {
        const d = Math.max(0, 1 - p.drag * dt);
        p.vx *= d;
        p.vy *= d;
      }

      const s = p.scale0 + (p.scale1 - p.scale0) * e;
      p.mesh.scale.set(p.base.x * s, p.base.y * s, 1);

      if (p.mesh.material) {
        p.mesh.material.opacity =
          p.opacity0 + (p.opacity1 - p.opacity0) * e;
      }
      p.mesh.rotation.z += p.spin * dt;

      if (k >= 1) {
        this.layer.remove(p.mesh);
        disposeSoft(p.mesh);
        this.items.splice(i, 1);
      }
    }
  }

  clear() {
    for (const p of this.items) {
      this.layer.remove(p.mesh);
      disposeSoft(p.mesh);
    }
    this.items = [];
  }
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

    /* fondo de mar + carcasa */
    this.sea = new ScrollingWorld({
      width: 1.31,
      height: 0.865,
      density: 1.1,
    });
    this.sea.group.position.set(0, 1.242, -1.79);
    this.group.add(this.sea.group);
    this.group.add(makeBezel());

    /* panel de juego dentro de la pantalla */
    this.status = new GamePanel(1.235, 0.181);
    this.status.mesh.position.set(0, 1.58, -1.68);
    this.group.add(this.status.mesh);

    /* línea de peligro */
    const dangerTex = makeDangerTexture();
    this.dangerLine = new THREE.Mesh(
      new THREE.PlaneGeometry(1.24, 0.014),
      new THREE.MeshBasicMaterial({
        map: dangerTex,
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
        toneMapped: false,
      })
    );
    this.dangerLine.position.set(0, LINE_Y, -1.56);
    this.group.add(this.dangerLine);

    /* vignette de daño */
    this.damageMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1.305, 0.86),
      new THREE.MeshBasicMaterial({
        map: makeVignetteTexture(),
        transparent: true,
        opacity: 0,
        depthWrite: false,
        toneMapped: false,
      })
    );
    this.damageMesh.position.set(0, 1.242, -1.72);
    this.group.add(this.damageMesh);
    this.damage = 0;

    /* nave */
    this.world.add(this.bulletLayer, this.targetLayer, this.fxLayer);
    this.group.add(this.world);

    this.ship = makePlane('player', 0.19);
    this.ship.position.set(0, SHIP_Y, SHIP_Z);
    this.world.add(this.ship);

    this.thrust = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: shared.glow(),
        color: 0x7ff8e4,
        transparent: true,
        opacity: 0.7,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      })
    );
    this.thrust.scale.setScalar(0.09);
    this.thrust.position.set(0, SHIP_Y - 0.11, SHIP_Z + 0.01);
    this.world.add(this.thrust);

    this.fx = new Fx(this.fxLayer);

    this.targetX = 0;
    this.firing = false;
    this.cooldown = 0;
    this.bullets = [];
    this.targets = [];
    this.shake = 0;
    this.bannerFx = null;

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
    const index =
      this.order[this.sectorPos] ?? this.order[this.order.length - 1];
    return SECTORS[index];
  }

  get isPractice() {
    return this.practiceSector !== null;
  }

  isPlaying() {
    return this.state === 'playing';
  }

  header() {
    if (this.isPractice) return `PRÁCTICA · ${this.sector.title.toUpperCase()}`;
    return `SECTOR ${this.sectorPos + 1}/${this.order.length} · ${this.sector.title.toUpperCase()}`;
  }

  refreshStatus() {
    this.status.setStats({
      stage: this.isPractice
        ? `PRÁCTICA ${this.sector.title}`
        : `STAGE ${this.sectorPos + 1} · ${this.sector.title}`,
      score: this.score,
      lives: this.lives,
      question: this.qIndex,
      total: this.queue.length,
      tone: this.sector.tone,
    });
  }

  ask(text) {
    this.status.setMessage(text, 'question', this.sector.tone);
  }

  showResultMessage(kind, text) {
    this.status.setMessage(text, kind, kind === 'ok' ? '#4ade80' : '#ff5d73');
  }

  /* --------------------------------------------------------------- flujo */

  beginSector() {
    const sector = this.sector;
    this.qIndex = 0;
    this.sea.setTint(SEA_MOODS[this.sectorPos % SEA_MOODS.length]);
    this.queue = shuffle(sector.questions)
      .slice(0, QUESTIONS_PER_SECTOR)
      .map(shuffleQuestion);
    this.state = 'intro';
    this.clearTargets();
    this.fx.clear();
    for (const bullet of this.bullets) {
      this.bulletLayer.remove(bullet.mesh);
      disposeSoft(bullet.mesh);
    }
    this.bullets = [];
    this.refreshStatus();
    this.ask(sector.brief);

    this.banner(
      this.isPractice ? 'PRÁCTICA' : `STAGE ${this.sectorPos + 1}`,
      sector.title.toUpperCase(),
      sector.tone,
      1.25
    );
    sfx.stage();

    this.api.after(2400, () => this.nextQuestion());
  }

  nextQuestion() {
    if (this.qIndex >= this.queue.length) {
      this.sectorClear();
      return;
    }

    this.clearBanner();
    this.current = this.queue[this.qIndex];
    this.state = 'playing';
    this.clearTargets();
    this.refreshStatus();
    this.ask(this.current.text);
    this.spawnWave();
  }

  spawnWave() {
    const picks = shuffle([0, 1, 2]);

    picks.forEach((lane, i) => {
      const isCorrect = i === this.current.correct;
      const color = ENEMY_KINDS[lane];

      const holder = new THREE.Group();
      const plane = makePlane(color, 0.19);
      plane.rotation.z = Math.PI;
      holder.add(plane);

      const label = makeCard({
        w: 0.33,
        h: 0.066,
        title: this.current.options[i],
        align: 'center',
        tone: SECTORS[this.order[this.sectorPos]].tone,
        titleColor: '#f5fbff',
        bg: 'rgba(8,14,24,0.92)',
        border: 'rgba(255,255,255,0.16)',
      });
      label.position.set(0, -0.135, 0.012);
      holder.add(label);

      const target = {
        holder,
        plane,
        label,
        x: LANES[lane],
        y: SPAWN_Y + 0.05,
        speed: 0.027 + this.sectorPos * 0.0045,
        correct: isCorrect,
        alive: true,
        phase: Math.random() * Math.PI * 2,
      };

      holder.position.set(target.x, target.y, TARGET_Z);
      this.targetLayer.add(holder);
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
      new THREE.PlaneGeometry(0.034, 0.12),
      new THREE.MeshBasicMaterial({
        map: shared.glow(),
        color: 0xffe9a3,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      })
    );
    bullet.position.set(this.ship.position.x, SHIP_Y + 0.1, BULLET_Z);
    this.bulletLayer.add(bullet);
    this.bullets.push({
      mesh: bullet,
      x: bullet.position.x,
      y: bullet.position.y,
    });

    // fogonazo
    const flash = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: shared.fire(),
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      })
    );
    flash.scale.setScalar(0.05);
    flash.position.set(this.ship.position.x, SHIP_Y + 0.11, BULLET_Z + 0.01);
    this.fx.add(flash, { life: 0.09, scale0: 1, scale1: 1.8, opacity0: 1, opacity1: 0 });

    this.ship.position.y = SHIP_Y - 0.006;
    sfx.shot();
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
      if (dist < 0.022 && dist < bestDist) {
        bestDist = dist;
        best = target;
      }
    }

    if (best) {
      this.addTracer(origin, new THREE.Vector3(best.x, best.y, TARGET_Z));
      this.hitTarget(best);
      return true;
    }

    this.cooldown = 0;
    this.fire();
    return true;
  }

  addTracer(origin, to) {
    const geo = new THREE.BufferGeometry().setFromPoints([origin, to]);
    const line = new THREE.Line(
      geo,
      new THREE.LineBasicMaterial({
        color: 0xfff0b0,
        transparent: true,
        opacity: 0.95,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      })
    );
    this.fx.add(line, { life: 0.16, opacity0: 0.95, opacity1: 0, scale0: 1, scale1: 1 });
  }

  /* ------------------------------------------------------------ colisiones */

  hitTarget(target) {
    if (!target.alive) return;
    target.alive = false;

    const isCorrect = target.correct;
    this.explode(target.x, target.y, isCorrect ? 0xffd479 : 0xff6a5a, 1);
    this.removeTarget(target);

    if (isCorrect) {
      this.combo += 1;
      const gain = 100 + (this.combo - 1) * 25;
      this.score += gain;
      this.qIndex += 1;
      this.state = 'feedback';
      sfx.ok();
      sfx.boom();

      this.popText(`+${gain}`, target.x, target.y + 0.02, '#7dffcf', 0.024);
      if (this.combo >= 2) {
        this.popText(`COMBO x${this.combo}`, target.x, target.y - 0.05, '#ffd479', 0.02);
      }

      this.showResultMessage(
        'ok',
        `¡Derribado! ${this.current.why}  +${gain} pts`
      );
      this.refreshStatus();

      this.clearTargets(0.4);
      this.api.after(1500, () => {
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
    this.shake = 0.05;
    this.damage = 1;
    this.refreshStatus();
    sfx.err();
    sfx.boom();

    this.showResultMessage(
      'err',
      `${title} ${detail} ${this.current.why}`
    );

    this.clearTargets(0.35);

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
    const extra = this.lives < MAX_LIVES;
    this.lives = Math.min(MAX_LIVES, this.lives + 1);
    this.score += 250;
    this.sectorsDone += 1;
    this.refreshStatus();

    this.banner(
      'STAGE CLEAR',
      extra ? '+250 PTS · VIDA EXTRA' : '+250 PTS',
      '#4ade80',
      1.6
    );
    this.showResultMessage(
      'ok',
      `Sector ${this.sectorPos + 1} despejado. +250 pts${extra ? ' y una vida extra' : ''}.`
    );
    sfx.win();

    this.api.after(2300, () => {
      this.sectorPos += 1;
      if (this.sectorPos >= this.order.length) this.victory();
      else this.beginSector();
    });
  }

  gameOver() {
    this.state = 'gameover';
    this.firing = false;
    this.clearTargets();
    this.fx.clear();
    this.api.submitScore(this.score, this.sectorsDone);
    this.showResultMessage(
      'err',
      `El escuadrón ha caído con ${this.score} puntos. Vuelve a intentarlo.`
    );
    this.showResult(false);
  }

  victory() {
    this.state = 'victory';
    this.firing = false;
    this.clearTargets();
    this.fx.clear();
    this.api.submitScore(this.score, this.sectorsDone);
    this.showResultMessage(
      'ok',
      this.isPractice
        ? `Práctica de ${this.sector.title} completada con ${this.score} puntos.`
        : `Los cinco sectores están despejados con ${this.score} puntos.`
    );
    this.showResult(true);
  }

  showResult(win) {
    this.clearBanner();
    const panel = makeCard({
      w: 0.78,
      h: 0.36,
      title: win
        ? this.isPractice
          ? '✔ PRÁCTICA COMPLETADA'
          : '✔ CAMPAÑA COMPLETADA'
        : '✘ ESCUADRÓN DERRIBADO',
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

  /* ------------------------------------------------------------ objetivos */

  clearTargets(delay = 0) {
    const list = this.targets;
    this.targets = [];

    for (const target of list) {
      if (!target.alive) continue;
      target.alive = false;
      if (delay > 0) {
        this.explode(target.x, target.y, 0xffb454, 0.6, delay);
      }
      this.removeTarget(target, delay);
    }
  }

  removeTarget(target, delay = 0) {
    const node = target.holder;
    if (!node) return;
    target.holder = null;

    const drop = () => {
      this.targetLayer.remove(node);
      disposeSoft(node);
      if (target.label && target.label.material.map) {
        target.label.material.map.dispose();
      }
    };

    if (delay > 0) this.api.after(delay * 1000, drop);
    else drop();
  }

  /* --------------------------------------------------------------- efectos */

  explode(x, y, color, scale = 1, delay = 0) {
    const z = TARGET_Z + 0.035;

    // destello
    this.fx.add(
      this.makeSprite(shared.glow(), 0.6 * scale, 0xfff3c4, x, y, z),
      {
        delay,
        life: 0.14,
        scale0: 0.3,
        scale1: 1.5,
        opacity0: 1,
        opacity1: 0,
      }
    );

    // bola de fuego
    this.fx.add(
      this.makeSprite(
        shared.fireball(),
        0.5 * scale,
        0xff8a2b,
        x,
        y,
        z,
        false
      ),
      {
        delay,
        life: 0.44,
        scale0: 0.3,
        scale1: 1.35,
        opacity0: 1,
        opacity1: 0,
      }
    );

    // núcleo brillante
    this.fx.add(
      this.makeSprite(shared.glow(), 0.3 * scale, 0xffe58a, x, y, z + 0.002),
      {
        delay,
        life: 0.28,
        scale0: 0.5,
        scale1: 1.6,
        opacity0: 0.9,
        opacity1: 0,
      }
    );

    // lenguas de fuego
    for (let i = 0; i < 10; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * 0.06 * scale;
      this.fx.add(
        this.makeSprite(
          shared.fireball(),
          (0.1 + Math.random() * 0.13) * scale,
          [0xffe58a, 0xffb03a, 0xff6a2a, 0xff3d1f][i % 4],
          x + Math.cos(angle) * dist,
          y + Math.sin(angle) * dist,
          z,
          false
        ),
        {
          delay: delay + Math.random() * 0.07,
          life: 0.32 + Math.random() * 0.35,
          vx: Math.cos(angle) * (0.12 + Math.random() * 0.35) * scale,
          vy: Math.sin(angle) * (0.12 + Math.random() * 0.35) * scale,
          drag: 2.4,
          gravity: 0.2,
          scale0: 1,
          scale1: 0.3,
          opacity0: 0.95,
          opacity1: 0,
        }
      );
    }

    // humo
    for (let i = 0; i < 5; i++) {
      this.fx.add(
        this.makeSprite(
          shared.smoke(),
          (0.14 + Math.random() * 0.14) * scale,
          0x8494a6,
          x + (Math.random() - 0.5) * 0.09,
          y + (Math.random() - 0.5) * 0.07,
          z - 0.015,
          false
        ),
        {
          delay: delay + 0.06 + i * 0.05,
          life: 0.8 + Math.random() * 0.5,
          vx: (Math.random() - 0.5) * 0.07,
          vy: 0.1 + Math.random() * 0.12,
          gravity: -0.02,
          scale0: 0.5,
          scale1: 2.2,
          opacity0: 0.55,
          opacity1: 0,
        }
      );
    }

    // onda expansiva
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.035, 0.05, 36),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      })
    );
    ring.position.set(x, y, z - 0.005);
    this.fx.add(ring, {
      delay,
      life: 0.36,
      scale0: 1,
      scale1: 3.6 * scale,
      opacity0: 0.55,
      opacity1: 0,
    });

    // metralla
    for (let i = 0; i < 6; i++) {
      const angle = Math.random() * Math.PI * 2;
      const debris = new THREE.Mesh(
        new THREE.PlaneGeometry(0.012, 0.045),
        new THREE.MeshBasicMaterial({
          color: 0x2a1a14,
          transparent: true,
          depthWrite: false,
          toneMapped: false,
        })
      );
      debris.position.set(x, y, z + 0.005);
      debris.rotation.z = angle;
      this.fx.add(debris, {
        delay,
        life: 0.45 + Math.random() * 0.3,
        vx: Math.cos(angle) * (0.2 + Math.random() * 0.4),
        vy: Math.sin(angle) * (0.2 + Math.random() * 0.4),
        gravity: 1.4,
        spin: (Math.random() - 0.5) * 20,
        opacity0: 1,
        opacity1: 0,
      });
    }
  }

  makeSprite(texture, size, color, x, y, z, additive = true) {
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: texture,
        color,
        transparent: true,
        blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
        depthWrite: false,
        toneMapped: false,
      })
    );
    sprite.scale.setScalar(size);
    sprite.position.set(x, y, z);
    return sprite;
  }

  popText(text, x, y, color, size = 0.02) {
    const label = makeText(text, {
      height: size,
      weight: 800,
      color,
      bg: 'rgba(4,10,18,0.5)',
      pad: 10,
      radius: 8,
    });
    label.position.set(x, y, TARGET_Z + 0.06);
    this.fx.add(label, {
      life: 0.8,
      vy: 0.13,
      drag: 1.4,
      scale0: 1,
      scale1: 1,
      opacity0: 1,
      opacity1: 0,
    });
  }

  banner(title, sub, tone = '#4de2c5', hold = 1.3) {
    this.clearBanner();

    const group = new THREE.Group();

    const plate = makeCard({
      w: 0.74,
      h: 0.23,
      title: '',
      sub: '',
      foot: '',
      tone,
      align: 'center',
      bg: 'rgba(4,9,16,0.8)',
      border: 'rgba(255,255,255,0.16)',
    });
    plate.position.z = -0.01;
    group.add(plate);

    const main = makeText(title, { height: 0.072, weight: 800, color: tone });
    main.position.set(0, 0.032, 0.01);
    group.add(main);

    if (sub) {
      const subText = makeText(sub, {
        height: 0.023,
        weight: 700,
        color: '#dbe9f5',
      });
      subText.position.set(0, -0.048, 0.01);
      group.add(subText);
    }

    group.position.set(0, 1.36, -1.42);
    this.group.add(group);
    this.bannerFx = { group, t: 0, hold, life: hold + 0.55 };
  }

  clearBanner() {
    if (!this.bannerFx) return;
    this.group.remove(this.bannerFx.group);
    disposeSoft(this.bannerFx.group);
    this.bannerFx = null;
  }

  /* ------------------------------------------------------------------ loop */

  update(dt, t) {
    this.cooldown = Math.max(0, this.cooldown - dt);
    this.sea.update(dt);
    this.fx.update(dt);

    // nave
    const shipX = this.ship.position.x;
    const dx = this.targetX - shipX;
    this.ship.position.x += dx * Math.min(1, dt * 10);
    this.ship.position.y =
      SHIP_Y + Math.sin(t * 3.1) * 0.004 - Math.min(0.008, Math.abs(dx) * 0.02);
    this.ship.rotation.z = THREE.MathUtils.clamp(dx * 1.4, -0.28, 0.28);

    const prop = this.ship.userData.prop;
    if (prop) prop.rotation.z -= dt * 42;

    this.thrust.position.x = this.ship.position.x;
    this.thrust.position.y = this.ship.position.y - 0.11;
    this.thrust.scale.setScalar(0.055 + Math.random() * 0.025);
    this.thrust.material.opacity = 0.55 + Math.random() * 0.3;

    const navs = [this.ship.userData.navL, this.ship.userData.navR];
    for (let i = 0; i < navs.length; i++) {
      if (navs[i]) navs[i].material.opacity = Math.sin(t * 6 + i * Math.PI) > 0 ? 1 : 0.1;
    }

    if (this.firing && this.state === 'playing') this.fire();

    // sacudida
    if (this.shake > 0) {
      this.world.position.x = (Math.random() - 0.5) * this.shake * 2;
      this.world.position.y = (Math.random() - 0.5) * this.shake * 2;
      this.shake = Math.max(0, this.shake - dt * 0.4);
      if (this.shake <= 0.0005) this.world.position.set(0, 0, 0);
    }

    // vignette de daño
    if (this.damage > 0) {
      this.damage = Math.max(0, this.damage - dt * 1.4);
      this.damageMesh.material.opacity = this.damage * 0.9;
    }

    // línea de peligro parpadea
    this.dangerLine.material.opacity = 0.35 + Math.sin(t * 3) * 0.12;

    // balas
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const bullet = this.bullets[i];
      bullet.y += BULLET_SPEED * dt;
      bullet.mesh.position.y = bullet.y;
      bullet.mesh.scale.y = 1 + Math.sin(t * 40 + i) * 0.15;

      let consumed = false;
      for (const target of this.targets) {
        if (!target.alive) continue;
        if (
          Math.abs(bullet.x - target.x) < 0.17 &&
          Math.abs(bullet.y - target.y) < 0.085
        ) {
          consumed = true;
          this.bulletLayer.remove(bullet.mesh);
          disposeSoft(bullet.mesh);
          this.bullets.splice(i, 1);
          this.hitTarget(target);
          break;
        }
      }

      if (consumed) continue;
      if (bullet.y > 1.7) {
        this.bulletLayer.remove(bullet.mesh);
        disposeSoft(bullet.mesh);
        this.bullets.splice(i, 1);
      }
    }

    // aviones enemigos
    if (this.state === 'playing') {
      for (const target of this.targets) {
        if (!target.alive) continue;
        target.y -= target.speed * dt;
        target.holder.position.y = target.y;
        target.holder.position.x =
          target.x + Math.sin(t * 1.25 + target.phase) * 0.012;
        target.holder.rotation.z = Math.sin(t * 1.8 + target.x * 8) * 0.05;
        const eProp = target.plane.userData.prop;
        if (eProp) eProp.rotation.z -= dt * 38;

        if (target.y < LINE_Y) {
          if (target.correct) {
            this.missAnswer();
            break;
          }
          target.alive = false;
          this.explode(target.x, LINE_Y - 0.02, 0x4a5a6a, 0.35);
          this.removeTarget(target);
        }
      }
    }

    // banner
    if (this.bannerFx) {
      const b = this.bannerFx;
      b.t += dt;
      const appear = Math.min(1, b.t / 0.16);
      const fade = b.t > b.hold ? Math.max(0, 1 - (b.t - b.hold) / 0.5) : 1;
      const op = appear * fade;
      b.group.scale.setScalar(1.15 - 0.15 * appear);
      b.group.traverse((obj) => {
        if (obj.material) obj.material.opacity = op;
      });
      if (b.t >= b.life) {
        this.group.remove(b.group);
        disposeSoft(b.group);
        this.bannerFx = null;
      }
    }
  }
}

export function buildArcade(api, opts) {
  return new Arcade(api, opts);
}
