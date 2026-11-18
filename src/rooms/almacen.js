import * as THREE from 'three';
import { COLORS, makeCard, makeText } from '../util.js';

const CLIENTES = [
  { id: 1, nombre: 'Ana', y: 1.44 },
  { id: 2, nombre: 'Luis', y: 1.33 },
  { id: 3, nombre: 'Marta', y: 1.22 },
];

const PEDIDOS = [
  { id: 10, cli: 1, y: 1.5 },
  { id: 11, cli: 2, y: 1.39 },
  { id: 12, cli: 2, y: 1.28 },
  { id: 13, cli: 99, y: 1.17 },
];

const X_CLIENTES = -0.45;
const X_PEDIDOS = 0.38;
const CARD_W = 0.3;
const Z = -1.2;

export const almacen = {
  id: 'almacen',
  title: 'El Almacén',
  tag: 'Bases de datos · INNER JOIN',
  tone: '#60a5fa',
  brief: 'Dos tablas unidas por una clave foránea. Encuentra el registro huérfano.',
  build(api) {
    const group = new THREE.Group();

    const headerLeft = makeText('clientes · id, nombre', {
      height: 0.025,
      weight: 700,
      color: '#60a5fa',
    });
    headerLeft.position.set(X_CLIENTES, 1.585, Z);
    group.add(headerLeft);

    const headerRight = makeText('pedidos · id, cliente_id', {
      height: 0.025,
      weight: 700,
      color: '#a78bfa',
    });
    headerRight.position.set(X_PEDIDOS, 1.585, Z);
    group.add(headerRight);

    for (const cliente of CLIENTES) {
      const card = makeCard({
        w: CARD_W,
        h: 0.085,
        title: `${cliente.id} · ${cliente.nombre}`,
        tone: '#60a5fa',
        align: 'center',
      });
      card.position.set(X_CLIENTES, cliente.y, Z);
      group.add(card);
    }

    const pedidoCards = new Map();

    for (const pedido of PEDIDOS) {
      const card = makeCard({
        w: CARD_W,
        h: 0.085,
        title: `${pedido.id} · cliente ${pedido.cli}`,
        tone: pedido.cli === 99 ? '#ff5d73' : '#a78bfa',
        align: 'center',
      });
      card.position.set(X_PEDIDOS, pedido.y, Z);
      card.userData.onSelect = () => choose(pedido.id);
      group.add(card);
      pedidoCards.set(pedido.id, card);
    }

    // Cuerdas de clave foránea
    for (const pedido of PEDIDOS) {
      const cliente = CLIENTES.find((c) => c.id === pedido.cli);

      if (cliente) {
        const start = new THREE.Vector3(X_PEDIDOS - CARD_W / 2, pedido.y, -1.18);
        const end = new THREE.Vector3(X_CLIENTES + CARD_W / 2, cliente.y, -1.18);
        const control = new THREE.Vector3(
          (start.x + end.x) / 2,
          (start.y + end.y) / 2 + 0.04,
          -1.02
        );
        const curve = new THREE.QuadraticBezierCurve3(start, control, end);
        group.add(
          new THREE.Mesh(
            new THREE.TubeGeometry(curve, 24, 0.0035, 6, false),
            new THREE.MeshBasicMaterial({
              color: 0x60a5fa,
              transparent: true,
              opacity: 0.55,
            })
          )
        );
      } else {
        // Registro huérfano: la cuerda no llega a ninguna fila
        const start = new THREE.Vector3(X_PEDIDOS - CARD_W / 2, pedido.y, -1.18);
        const control = new THREE.Vector3(0.12, 1.07, -1.02);
        const end = new THREE.Vector3(0.02, 0.99, -1.06);
        const curve = new THREE.QuadraticBezierCurve3(start, control, end);
        group.add(
          new THREE.Mesh(
            new THREE.TubeGeometry(curve, 24, 0.0035, 6, false),
            new THREE.MeshBasicMaterial({
              color: 0xff5d73,
              transparent: true,
              opacity: 0.6,
            })
          )
        );

        const loose = new THREE.Mesh(
          new THREE.SphereGeometry(0.012, 16, 12),
          new THREE.MeshStandardMaterial({
            color: COLORS.danger,
            emissive: COLORS.danger,
            emissiveIntensity: 1.2,
          })
        );
        loose.position.copy(end);
        group.add(loose);
      }
    }

    let locked = false;

    function choose(id) {
      if (locked) return;
      const card = pedidoCards.get(id);

      if (id === 13) {
        locked = true;
        card.material.color.setHex(0x8affc1);
        api.complete(
          'INNER JOIN devuelve 3 filas (10, 11 y 12). El pedido 13 apunta a cliente_id 99, que no existe: es un registro huérfano y rompe la integridad referencial. Vuelve al hub.'
        );
      } else {
        card.material.color.setHex(0xff9aa7);
        api.err(
          'Ese pedido sí tiene cliente: aparecería en el resultado del INNER JOIN.',
          'Busca el que apunta a un id inexistente'
        );
        api.after(700, () => card.material.color.setHex(0xffffff));
      }
    }

    api.tick((dt, t) => {
      pedidoCards.forEach((card, id) => {
        if (id !== 13) card.position.z = Z + Math.sin(t * 0.9 + id) * 0.0015;
      });
    });

    api.say(
      'Haz clic en el pedido que NO aparecerá en un INNER JOIN con clientes.',
      'Pista: mira a qué cliente apunta cada fila'
    );

    return group;
  },
};
