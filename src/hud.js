import * as THREE from 'three';
import { FONT, roundRect } from './util.js';

/**
 * Panel de instrucciones anclado a la cabeza.
 * Se dibuja sobre un canvas y se coloca delante de la cámara,
 * ligeramente por encima del diorama. Funciona igual en escritorio y en VR.
 */
export class HUD {
  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = 1200;
    this.canvas.height = 250;
    this.ctx = this.canvas.getContext('2d');

    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;

    this.mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(0.84, 0.175),
      new THREE.MeshBasicMaterial({
        map: this.texture,
        transparent: true,
        depthTest: false,
        depthWrite: false,
        opacity: 0.97,
        toneMapped: false,
      })
    );
    this.mesh.renderOrder = 999;

    this.group = new THREE.Group();
    this.group.add(this.mesh);
    this.group.position.set(0, 0.35, -0.99);

    this.title = '';
    this.body = '';
    this.foot = '';
    this.tone = '#4de2c5';
    this.draw();
  }

  set(title, body, foot = '', tone = '#4de2c5') {
    this.title = title || '';
    this.body = body || '';
    this.foot = foot || '';
    this.tone = tone || '#4de2c5';
    this.draw();
  }

  draw() {
    const { ctx, canvas } = this;
    const W = canvas.width;
    const H = canvas.height;

    ctx.clearRect(0, 0, W, H);

    ctx.fillStyle = 'rgba(6,11,20,0.9)';
    roundRect(ctx, 0, 0, W, H, 34);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255,255,255,0.09)';
    ctx.lineWidth = 3;
    roundRect(ctx, 1.5, 1.5, W - 3, H - 3, 32);
    ctx.stroke();

    ctx.fillStyle = this.tone;
    roundRect(ctx, 0, 0, 13, H, 6);
    ctx.fill();

    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    ctx.fillStyle = this.tone;
    ctx.font = `700 26px ${FONT}`;
    ctx.fillText(this.title.toUpperCase(), 54, 34);

    ctx.fillStyle = '#eaf2f7';
    ctx.font = `500 33px ${FONT}`;
    const lines = this.wrap(this.body, W - 108);
    lines.slice(0, 3).forEach((line, i) => {
      const text = i === 2 && lines.length > 3 ? `${line.slice(0, -1)}…` : line;
      ctx.fillText(text, 54, 80 + i * 42);
    });

    if (this.foot) {
      ctx.fillStyle = '#7f93ab';
      ctx.font = `600 23px ${FONT}`;
      ctx.fillText(this.foot, 54, H - 22);
    }

    this.texture.needsUpdate = true;
  }

  wrap(text, maxWidth) {
    const { ctx } = this;
    const out = [];
    for (const paragraph of String(text).split('\n')) {
      const words = paragraph.split(/\s+/).filter(Boolean);
      if (!words.length) {
        out.push('');
        continue;
      }
      let line = words[0];
      for (let i = 1; i < words.length; i++) {
        const probe = `${line} ${words[i]}`;
        if (ctx.measureText(probe).width > maxWidth) {
          out.push(line);
          line = words[i];
        } else {
          line = probe;
        }
      }
      out.push(line);
    }
    return out;
  }
}
