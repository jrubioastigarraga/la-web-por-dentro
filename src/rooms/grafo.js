import * as THREE from 'three';
import { COLORS, makeText } from '../util.js';

const COMMITS = [
  { id: 'C1', x: -0.58, y: 1.18, branch: 'main' },
  { id: 'C2', x: -0.31, y: 1.18, branch: 'main' },
  { id: 'C3', x: -0.04, y: 1.18, branch: 'main' },
  { id: 'C4', x: 0.23, y: 1.18, branch: 'main' },
  { id: 'F1', x: -0.04, y: 1.43, branch: 'feature' },
  { id: 'F2', x: 0.23, y: 1.43, branch: 'feature' },
];

const HINTS = {
  C1: 'C1 es anterior a la rama: allí feature todavía no existía.',
  C3: 'C3 está en main, después de la bifurcación.',
  C4: 'C4 es la punta de main, no el ancestro común.',
  F1: 'F1 ya está en feature, después de la bifurcación.',
  F2: 'F2 es la punta de feature. Busca el punto donde nació la rama.',
};

const Z = -1.3;

export const grafo = {
  id: 'grafo',
  title: 'El Grafo',
  tag: 'Git · ramas y merges',
  tone: '#a78bfa',
  brief: 'Dos ramas, un historial. Encuentra el commit del que ambas nacen.',
  build(api) {
    const group = new THREE.Group();

    function tube(points, color, opacity = 0.7) {
      const curve =
        points.length === 2
          ? new THREE.LineCurve3(points[0], points[1])
          : new THREE.QuadraticBezierCurve3(points[0], points[1], points[2]);
      const geo = new THREE.TubeGeometry(curve, points.length === 2 ? 1 : 32, 0.0045, 6, false);
      return new THREE.Mesh(
        geo,
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity })
      );
    }

    const byId = new Map();
    for (const commit of COMMITS) byId.set(commit.id, commit);

    const link = (a, b, color) =>
      tube(
        [new THREE.Vector3(a.x, a.y, Z), new THREE.Vector3(b.x, b.y, Z)],
        color
      );

    // Historial de main
    group.add(link(byId.get('C1'), byId.get('C2'), 0x4de2c5));
    group.add(link(byId.get('C2'), byId.get('C3'), 0x4de2c5));
    group.add(link(byId.get('C3'), byId.get('C4'), 0x4de2c5));

    // Rama feature, que nace en C2
    group.add(
      tube(
        [
          new THREE.Vector3(byId.get('C2').x, byId.get('C2').y, Z),
          new THREE.Vector3(-0.36, 1.43, Z),
          new THREE.Vector3(byId.get('F1').x, byId.get('F1').y, Z),
        ],
        0xa78bfa
      )
    );
    group.add(link(byId.get('F1'), byId.get('F2'), 0xa78bfa));

    const mainLabel = makeText('main', {
      height: 0.025,
      weight: 700,
      color: '#4de2c5',
    });
    mainLabel.position.set(-0.72, 1.18, Z);
    group.add(mainLabel);

    const featureLabel = makeText('feature', {
      height: 0.025,
      weight: 700,
      color: '#a78bfa',
    });
    featureLabel.position.set(-0.73, 1.45, Z);
    group.add(featureLabel);

    const meshes = [];
    for (const commit of COMMITS) {
      const color = commit.branch === 'main' ? COLORS.accent : COLORS.purple;
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.045, 24, 18),
        new THREE.MeshStandardMaterial({
          color,
          emissive: color,
          emissiveIntensity: 0.5,
          roughness: 0.3,
          metalness: 0.2,
        })
      );
      mesh.position.set(commit.x, commit.y, Z);
      mesh.userData.onSelect = () => choose(commit.id);
      group.add(mesh);
      meshes.push(mesh);

      const label = makeText(commit.id, {
        height: 0.026,
        weight: 700,
        color: '#c8d6e6',
      });
      if (commit.branch === 'main') {
        label.center.set(0.5, 1);
        label.position.set(commit.x, commit.y - 0.055, Z);
      } else {
        label.center.set(0.5, 0);
        label.position.set(commit.x, commit.y + 0.055, Z);
      }
      group.add(label);
    }

    let locked = false;
    let merged = false;

    function choose(id) {
      if (locked) return;

      if (id === 'C2') {
        locked = true;
        const mesh = meshes[COMMITS.findIndex((c) => c.id === 'C2')];
        mesh.material.color.setHex(COLORS.ok);
        mesh.material.emissive.setHex(COLORS.ok);
        api.ok(
          'Ese es el merge base: C2 es el ancestro común de main y feature.',
          'Merge base encontrado'
        );

        if (!merged) {
          merged = true;
          const c4 = byId.get('C4');
          const f2 = byId.get('F2');

          const merge = new THREE.Mesh(
            new THREE.SphereGeometry(0.05, 24, 18),
            new THREE.MeshStandardMaterial({
              color: COLORS.accent2,
              emissive: COLORS.accent2,
              emissiveIntensity: 0.8,
              roughness: 0.3,
            })
          );
          merge.position.set(0.52, 1.3, Z);
          group.add(merge);

          group.add(
            tube(
              [
                new THREE.Vector3(c4.x, c4.y, Z),
                new THREE.Vector3(0.46, 1.17, Z),
                new THREE.Vector3(0.52, 1.3, Z),
              ],
              0xffb454
            )
          );
          group.add(
            tube(
              [
                new THREE.Vector3(f2.x, f2.y, Z),
                new THREE.Vector3(0.46, 1.44, Z),
                new THREE.Vector3(0.52, 1.3, Z),
              ],
              0xffb454
            )
          );

          const mergeLabel = makeText('merge', {
            height: 0.024,
            weight: 700,
            color: '#ffb454',
          });
          mergeLabel.center.set(0.5, 0);
          mergeLabel.position.set(0.52, 1.36, Z);
          group.add(mergeLabel);
        }

        api.after(1400, () => {
          api.complete(
            'El merge base es el ancestro común. Git lo usa para el merge a tres bandas y para detectar conflictos. Vuelve al hub.'
          );
        });
      } else {
        api.err(`No: ${HINTS[id]}`, 'Busca el punto de separación');
      }
    }

    api.tick((dt, t) => {
      meshes.forEach((mesh, i) => {
        mesh.material.emissiveIntensity = 0.45 + Math.sin(t * 2 + i * 0.8) * 0.15;
      });
    });

    api.say(
      'Haz clic en el commit base del merge (merge base) entre main y feature.',
      'Pista: es el ancestro común de las dos ramas'
    );

    return group;
  },
};
