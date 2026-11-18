import * as THREE from 'three';
import { makeCard, makeGlow, makeText } from './util.js';
import { rooms } from './rooms/index.js';

/**
 * Hub central: cinco tarjetas flotantes, una por sala.
 * No hay locomoción: el jugador permanece en el centro y apunta con la mirada/mano.
 */
export function buildHub(api) {
  const group = new THREE.Group();
  const done = api.progressCount();
  const all = done === rooms.length;

  const panels = [];

  rooms.forEach((room, i) => {
    const solved = api.isSolved(room.id);
    const x = (i - 2) * 0.355;
    const z = -1.26 - Math.abs(i - 2) * 0.045;

    const card = makeCard({
      w: 0.33,
      h: 0.21,
      title: `${String(i + 1).padStart(2, '0')} · ${room.title}`,
      sub: room.tag,
      foot: solved ? '✔ completada' : 'pendiente',
      tone: solved ? '#4ade80' : room.tone,
      bg: solved ? 'rgba(11,28,23,0.95)' : 'rgba(10,17,29,0.95)',
    });
    card.position.set(x, 1.24, z);
    card.rotation.y = -x * 0.3;
    card.userData.onSelect = () => api.openRoom(room.id);
    group.add(card);
    panels.push(card);

    const aura = makeGlow(solved ? '#4ade80' : room.tone, 0.62, 0.16);
    aura.position.set(x, 1.24, z - 0.02);
    group.add(aura);
  });

  const progress = makeText(`${done} / ${rooms.length} salas completadas`, {
    height: 0.023,
    weight: 600,
    color: all ? '#4ade80' : '#6f8199',
  });
  progress.position.set(0, 1.02, -1.08);
  group.add(progress);

  api.tick((dt, t) => {
    panels.forEach((panel, i) => {
      panel.position.y = 1.24 + Math.sin(t * 1.2 + i * 0.7) * 0.004;
    });
  });

  api.say(
    all
      ? 'Cinco sistemas restaurados. La web vuelve a funcionar.'
      : 'Cinco sistemas están rotos. Entra en cada sala y depura lo que falla.',
    all ? 'Puedes repetir cualquier sala.' : 'Haz clic en una tarjeta para entrar.'
  );

  return group;
}
