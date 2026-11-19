import * as THREE from 'three';
import { makeButton, makeCard, makeGlow, makeText } from './util.js';
import { SECTORS } from './arcade/questions.js';
import { ScrollingWorld, makePlane } from './arcade/art.js';

/**
 * Pantalla de inicio: mar en scroll, título y una tarjeta por asignatura
 * para practicar un solo sector.
 */
export function buildMenu(api) {
  const group = new THREE.Group();

  const sea = new ScrollingWorld({
    width: 6.4,
    height: 4.4,
    density: 3.6,
    scale: 1.4,
  });
  sea.group.position.set(0, 1.2, -2.9);
  group.add(sea.group);

  const veil = new THREE.Mesh(
    new THREE.PlaneGeometry(6.4, 4.4),
    new THREE.MeshBasicMaterial({
      color: 0x030810,
      transparent: true,
      opacity: 0.48,
      depthWrite: false,
      toneMapped: false,
    })
  );
  veil.position.set(0, 1.2, -2.86);
  group.add(veil);

  const watermark = makeText('1945', {
    size: 220,
    height: 0.19,
    color: '#ffb454',
    weight: 800,
  });
  watermark.material.opacity = 0.13;
  watermark.position.set(0, 1.4, -1.64);
  group.add(watermark);

  const title = makeText('ESCUADRÓN WEB', {
    size: 96,
    height: 0.066,
    color: '#ffffff',
    weight: 800,
  });
  title.position.set(0, 1.6, -1.55);
  group.add(title);

  const glow = makeGlow('#4de2c5', 2.8, 0.26);
  glow.position.set(0, 1.52, -1.75);
  group.add(glow);

  const subtitle = makeText('LA WEB POR DENTRO · ARCADE DAW', {
    height: 0.019,
    weight: 700,
    color: '#4de2c5',
  });
  subtitle.position.set(0, 1.5, -1.5);
  group.add(subtitle);

  const play = makeButton('▶  JUGAR CAMPAÑA', {
    w: 0.52,
    h: 0.09,
    color: '#4de2c5',
  });
  play.position.set(0, 1.3, -1.5);
  play.userData.onSelect = () => api.startGame({ sector: null });
  group.add(play);

  const playGlow = makeGlow('#4de2c5', 0.9, 0.18);
  playGlow.position.set(0, 1.3, -1.55);
  group.add(playGlow);

  const practiceLabel = makeText('PRACTICAR UN SECTOR', {
    height: 0.016,
    weight: 700,
    color: '#8296ad',
  });
  practiceLabel.position.set(0, 1.18, -1.5);
  group.add(practiceLabel);

  const cards = [];
  SECTORS.forEach((sector, i) => {
    const x = (i - 2) * 0.375;
    const card = makeCard({
      w: 0.355,
      h: 0.135,
      title: `${i + 1} · ${sector.title}`,
      sub: sector.tag,
      foot: `${sector.questions.length} preguntas`,
      tone: sector.tone,
      align: 'center',
      bg: 'rgba(8,15,26,0.92)',
    });
    card.position.set(x, 1.06, -1.32 - Math.abs(i - 2) * 0.03);
    card.rotation.y = -x * 0.25;
    card.userData.onSelect = () => api.startGame({ sector: i });
    group.add(card);
    cards.push(card);

    const aura = makeGlow(sector.tone, 0.5, 0.12);
    aura.position.set(x, 1.06, card.position.z - 0.01);
    group.add(aura);
  });

  // aviones de escolta decorativos
  const escorts = [
    { plane: makePlane('red', 0.26), x: -1.18, y: 1.24, z: -2.1, phase: 0 },
    { plane: makePlane('amber', 0.22), x: 1.2, y: 1.3, z: -2.05, phase: 2 },
  ];
  for (const escort of escorts) {
    escort.plane.position.set(escort.x, escort.y, escort.z);
    escort.plane.rotation.z = Math.PI;
    group.add(escort.plane);
  }

  api.tick((dt, t) => {
    sea.update(dt);

    cards.forEach((card, i) => {
      card.position.y = 1.06 + Math.sin(t * 1.4 + i * 0.8) * 0.005;
    });
    title.position.y = 1.6 + Math.sin(t * 0.9) * 0.006;
    watermark.material.opacity = 0.07 + Math.sin(t * 0.7) * 0.03;

    escorts.forEach((escort, i) => {
      escort.plane.position.x =
        escort.x + Math.sin(t * 0.55 + escort.phase) * 0.12;
      escort.plane.position.y =
        escort.y + Math.sin(t * 1.1 + escort.phase) * 0.02;
      escort.plane.rotation.z =
        Math.PI + Math.cos(t * 0.55 + escort.phase) * 0.22;
      const prop = escort.plane.userData.prop;
      if (prop) prop.rotation.z -= dt * (30 + i * 8);
    });
  });

  api.setHud(
    'ESCUADRÓN WEB',
    'Derriba la respuesta correcta antes de que cruce la línea. Si disparas a una equivocada, pierdes una vida. Tres vidas y cinco sectores.',
    api.best > 0
      ? `Récord personal: ${api.best} pts · ${api.bestSectors}/5 sectores despejados`
      : 'Campaña: 5 sectores · 6 preguntas por sector',
    '#4de2c5'
  );

  return group;
}
