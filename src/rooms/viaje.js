import * as THREE from 'three';
import { COLORS, disposeObject, makeOrb, makeText, tintOrb } from '../util.js';

const STEPS = [
  {
    q: 'Paso 1 · DNS: ¿qué registro traduce "midominio.es" a una IPv4?',
    opts: ['A', 'MX', 'CNAME'],
    correct: 0,
    why: 'Correcto: el registro A asocia un nombre a una dirección IPv4.',
    hint: 'MX es para el correo y CNAME es un alias de otro nombre.',
  },
  {
    q: 'Paso 2 · HTTPS: ¿en qué puerto escucha por defecto?',
    opts: ['80', '443', '3306'],
    correct: 1,
    why: 'Correcto: HTTPS usa el 443 y cifra con TLS.',
    hint: 'El 80 es HTTP sin cifrar; el 3306 es MySQL.',
  },
  {
    q: 'Paso 3 · Balanceador: ¿a qué servidor envías la petición?',
    opts: ['srv-01\n500', 'srv-02\n200', 'srv-03\n404'],
    correct: 1,
    why: 'Correcto: solo srv-02 responde 200 (OK).',
    hint: 'El 500 es un fallo del servidor y el 404, un recurso inexistente.',
  },
];

export const viaje = {
  id: 'viaje',
  title: 'El Viaje',
  tag: 'Despliegue · DNS · HTTPS',
  tone: '#4de2c5',
  brief: 'Una petición sale del navegador hacia el servidor. Supera los 3 pasos.',
  build(api) {
    const group = new THREE.Group();

    const Y = 1.5;
    const Z = -1.45;
    const nodes = [
      { label: 'Navegador', x: -0.62 },
      { label: 'DNS', x: -0.21 },
      { label: 'TLS', x: 0.21 },
      { label: 'Servidor', x: 0.62 },
    ];

    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-0.68, Y, Z),
        new THREE.Vector3(0.68, Y, Z),
      ]),
      new THREE.LineBasicMaterial({ color: 0x2a3f5c })
    );
    group.add(line);

    const nodeMeshes = [];
    for (const node of nodes) {
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.028, 20, 16),
        new THREE.MeshStandardMaterial({
          color: 0x24354d,
          emissive: 0x16283d,
          emissiveIntensity: 1,
        })
      );
      mesh.position.set(node.x, Y, Z);
      group.add(mesh);
      nodeMeshes.push(mesh);

      const label = makeText(node.label, {
        height: 0.024,
        weight: 600,
        color: '#7f93ab',
      });
      label.position.set(node.x, Y - 0.068, Z);
      group.add(label);
    }

    const packet = new THREE.Mesh(
      new THREE.SphereGeometry(0.022, 24, 16),
      new THREE.MeshStandardMaterial({
        color: 0xffd479,
        emissive: 0xffb454,
        emissiveIntensity: 1.5,
      })
    );
    packet.position.set(nodes[0].x, Y + 0.055, Z);
    packet.userData.targetX = nodes[0].x;
    group.add(packet);

    let step = 0;
    let locked = false;
    let current = null;

    const orbY = 1.105;
    const orbZ = -1.02;

    function clearOrbs() {
      if (!current) return;
      group.remove(current);
      disposeObject(current);
      current = null;
    }

    function paint(orb, hex) {
      tintOrb(orb, hex);
    }

    function choose(index) {
      if (locked) return;
      const data = STEPS[step];

      if (index === data.correct) {
        locked = true;
        paint(current.children[index], COLORS.ok);

        nodeMeshes[step].material.color.setHex(COLORS.accent);
        nodeMeshes[step].material.emissive.setHex(COLORS.accent);
        packet.userData.targetX = nodes[step + 1].x;

        api.ok(data.why, `Paso ${step + 1} de 3 superado`);

        api.after(1150, () => {
          step += 1;
          locked = false;
          if (step >= STEPS.length) {
            nodeMeshes[3].material.color.setHex(COLORS.ok);
            nodeMeshes[3].material.emissive.setHex(COLORS.ok);
            api.complete(
              'Petición completada: DNS resolvió, TLS cifró y el balanceador eligió un servidor sano. Vuelve al hub.'
            );
          } else {
            renderStep();
          }
        });
      } else {
        paint(current.children[index], COLORS.danger);
        api.err(`No: ${data.hint}`, `Paso ${step + 1} de 3`);
        api.after(800, () => paint(current.children[index], COLORS.accent));
      }
    }

    function renderStep() {
      clearOrbs();
      const data = STEPS[step];
      api.say(data.q, `Paso ${step + 1} de 3 · haz clic en una respuesta`);

      current = new THREE.Group();
      const xs = [-0.45, 0, 0.45];
      data.opts.forEach((label, i) => {
        const orb = makeOrb(label, { radius: 0.055, height: 0.026 });
        orb.position.set(xs[i], orbY, orbZ);
        orb.userData.onSelect = () => choose(i);
        current.add(orb);
      });
      group.add(current);
    }

    api.tick((dt) => {
      const target = packet.userData.targetX ?? nodes[0].x;
      packet.position.x += (target - packet.position.x) * Math.min(1, dt * 6);
      packet.position.y = Y + 0.055 + Math.sin(performance.now() * 0.004) * 0.009;
    });

    renderStep();
    return group;
  },
};
