import * as THREE from 'three';
import { COLORS, makeCard } from '../util.js';

const ROUNDS = [
  {
    q: 'Ronda 1 de 3 · ¿Qué capa crece al añadir `padding: 24px`?',
    key: 'padding',
    why: 'El padding es el espacio entre el contenido y el borde.',
    hint: 'Está pegado al contenido, por dentro del borde.',
  },
  {
    q: 'Ronda 2 de 3 · ¿Qué capa pinta `border: 2px solid`?',
    key: 'border',
    why: 'El borde rodea el padding y el contenido.',
    hint: 'No es el margen: el borde va pegado al padding.',
  },
  {
    q: 'Ronda 3 de 3 · ¿Qué capa queda fuera del `background`?',
    key: 'margin',
    why: 'El margen separa la caja de las demás: el fondo no lo pinta.',
    hint: 'Es la capa más externa del modelo de caja.',
  },
];

const LAYERS = [
  { key: 'margin', size: 0.6, z: -1.62, color: '#7c9cff', opacity: 0.05 },
  { key: 'border', size: 0.48, z: -1.5, color: '#ffb454', opacity: 0.2 },
  { key: 'padding', size: 0.35, z: -1.38, color: '#4ade80', opacity: 0.16 },
  { key: 'content', size: 0.22, z: -1.26, color: '#60a5fa', opacity: 0.8 },
];

export const arbol = {
  id: 'arbol',
  title: 'El Árbol',
  tag: 'CSS · modelo de caja',
  tone: '#ffb454',
  brief: 'Cuatro capas, una pregunta en cada ronda. Haz clic en la capa correcta.',
  build(api) {
    const group = new THREE.Group();
    const CY = 1.27;

    const layerMap = new Map();

    LAYERS.forEach((def, index) => {
      const geo = new THREE.BoxGeometry(def.size, def.size, 0.085);
      const mat = new THREE.MeshStandardMaterial({
        color: def.color,
        transparent: true,
        opacity: def.opacity,
        roughness: 0.45,
        metalness: 0.05,
        depthWrite: false,
      });
      const box = new THREE.Mesh(geo, mat);
      box.position.set(0, CY, def.z);
      box.renderOrder = 10 + index;

      const edges = new THREE.LineSegments(
        new THREE.EdgesGeometry(geo),
        new THREE.LineBasicMaterial({
          color: def.color,
          transparent: true,
          opacity: 0.95,
        })
      );
      box.add(edges);

      group.add(box);
      layerMap.set(def.key, { def, box, edges });

      const hot = new THREE.Mesh(
        new THREE.PlaneGeometry(def.size + 0.02, def.size + 0.02),
        new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
      );
      hot.position.copy(box.position);
      hot.position.z += 0.05;
      hot.userData.onSelect = () => guess(def.key);
      group.add(hot);
    });

    // Leyenda clicable a la derecha: atajo para elegir capa
    LAYERS.forEach((def, i) => {
      const y = 1.48 - i * 0.1;
      const pill = makeCard({
        w: 0.36,
        h: 0.075,
        title: def.key,
        tone: def.color,
        bg: 'rgba(10,17,29,0.92)',
        border: 'rgba(255,255,255,0.08)',
      });
      pill.position.set(0.66, y, -1.05);
      pill.userData.onSelect = () => guess(def.key);
      group.add(pill);
    });

    let round = 0;
    let locked = false;

    function paint(key, hex) {
      const layer = layerMap.get(key);
      if (!layer) return;
      layer.box.material.color.set(hex);
      layer.edges.material.color.set(hex);
    }

    function restoreColors() {
      for (const { def, box, edges } of layerMap.values()) {
        box.material.color.set(def.color);
        edges.material.color.set(def.color);
        box.material.opacity = def.opacity;
      }
    }

    function ask() {
      restoreColors();
      const data = ROUNDS[round];
      api.say(data.q, `Ronda ${round + 1} de 3 · capa ${round + 1}`);
    }

    function guess(key) {
      if (locked) return;
      const data = ROUNDS[round];

      if (key === data.key) {
        locked = true;
        const layer = layerMap.get(key);
        layer.box.material.opacity = 0.55;
        paint(key, COLORS.ok);
        api.ok(data.why, `Ronda ${round + 1} de 3 superada`);

        api.after(1250, () => {
          round += 1;
          locked = false;
          if (round >= ROUNDS.length) {
            api.complete(
              'Ya distingues content, padding, border y margin. Ese es el modelo de caja de CSS. Vuelve al hub.'
            );
          } else {
            ask();
          }
        });
      } else {
        paint(key, COLORS.danger);
        api.err(`No exactamente. ${data.hint}`, `Ronda ${round + 1} de 3`);
        api.after(700, restoreColors);
      }
    }

    api.tick((dt, t) => {
      for (const { box } of layerMap.values()) {
        box.rotation.y = Math.sin(t * 0.35) * 0.03;
        box.rotation.x = Math.cos(t * 0.28) * 0.015;
      }
    });

    ask();
    return group;
  },
};
