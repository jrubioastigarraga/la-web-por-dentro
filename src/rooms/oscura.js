import * as THREE from 'three';
import { disposeObject, makeCard, makeText } from '../util.js';

const FIELDS = [
  { title: 'Nombre', sub: 'input type="text"', hint: 'Primer campo del formulario' },
  { title: 'Correo electrónico', sub: 'input type="email"', hint: 'Después del nombre' },
  {
    title: 'Acepto la política',
    sub: 'input type="checkbox"',
    hint: 'Antes del botón de envío',
  },
  { title: 'Enviar', sub: 'button type="submit"', hint: 'Último: envía el formulario' },
];

const Z = -1.15;

export const oscura = {
  id: 'oscura',
  title: 'La Sala Oscura',
  tag: 'Accesibilidad · foco y teclado',
  tone: '#f472b6',
  brief: 'Un formulario no es accesible si el foco salta sin orden. Recórrelo con Tab.',
  build(api) {
    const group = new THREE.Group();

    const frame = makeCard({
      w: 0.72,
      h: 0.66,
      title: '',
      tone: null,
      bg: 'rgba(10,18,31,0.94)',
      border: 'rgba(244,114,182,0.22)',
    });
    frame.position.set(0, 1.31, -1.3);
    group.add(frame);

    const heading = makeText('Formulario de alta', {
      height: 0.028,
      weight: 700,
      color: '#f9a8d4',
    });
    heading.position.set(0, 1.59, Z);
    group.add(heading);

    const cards = [];
    const badges = [];
    let next = 0;
    let locked = false;

    FIELDS.forEach((field, i) => {
      const card = makeCard({
        w: 0.54,
        h: 0.1,
        title: field.title,
        sub: field.sub,
        tone: '#f472b6',
        titleColor: '#eaf2f7',
      });
      card.position.set(0, 1.49 - i * 0.13, Z);
      card.userData.onSelect = () => pick(i);
      group.add(card);
      cards.push(card);
    });

    function clearBadges() {
      for (const badge of badges) {
        group.remove(badge);
        disposeObject(badge);
      }
      badges.length = 0;
    }

    function reset() {
      clearBadges();
      cards.forEach((card) => card.material.color.setHex(0xffffff));
      next = 0;
    }

    function pick(index) {
      if (locked) return;

      if (index === next) {
        const card = cards[index];
        card.material.color.setHex(0x9dffc4);

        const badge = makeText(String(next + 1), {
          height: 0.03,
          weight: 800,
          color: '#4ade80',
        });
        badge.position.set(-0.34, card.position.y, Z + 0.01);
        group.add(badge);
        badges.push(badge);

        next += 1;

        if (next === FIELDS.length) {
          api.complete(
            'Orden correcto: nombre → correo → aceptar → enviar. El foco sigue el orden visual, cada control necesita etiqueta y el contraste mínimo es 4.5:1.'
          );
        } else {
          api.say(
            `Bien. Siguiente: ${FIELDS[next].hint}.`,
            `Paso ${next} de 4 · sigue el orden de tabulación`
          );
        }
      } else {
        locked = true;
        api.err(
          'Ese no es el siguiente en el orden de tabulación. El recorrido se reinicia.',
          'El foco debe seguir el orden visual'
        );
        api.after(750, () => {
          reset();
          locked = false;
          api.say(
            'Recorre el formulario de arriba abajo, como haría el tabulador.',
            'Paso 1 de 4 · empieza por el primer campo'
          );
        });
      }
    }

    api.tick((dt, t) => {
      badges.forEach((badge, i) => {
        badge.position.y = cards[i].position.y + Math.sin(t * 2.5) * 0.003;
      });
    });

    api.say(
      'Simula el recorrido con Tab: haz clic en los 4 elementos en el orden correcto.',
      'Paso 1 de 4 · empieza por el primer campo'
    );

    return group;
  },
};
