# Escuadrón Web

[](#escuadrón-web)

Arcade de aviones en **3D y realidad virtual** para el ciclo de **Desarrollo de Aplicaciones Web (DAW)**. Cinco sectores convierten los contenidos de clase en una misión de disparos: hay que **derribar la respuesta correcta** antes de que cruce la línea de defensa.

> **Demo:** [https://jrubioastigarraga.github.io/la-web-por-dentro/](https://jrubioastigarraga.github.io/la-web-por-dentro/)

> Funciona en cualquier navegador moderno. Para VR, ábrelo en el navegador de Meta Quest y pulsa **Enter VR**.

![Pantalla de inicio](/jrubioastigarraga/la-web-por-dentro/raw/main/docs/hub.png)

## Cómo se juega

[](#cómo-se-juega)

- Cada pregunta lanza **cuatro aviones** con cuatro respuestas posibles. Solo una es correcta.
- **Mueve el ratón** para pilotar tu avión y **haz clic** (o pulsa `ESPACIO`) para disparar.
- Si derribas la respuesta correcta: puntos y siguiente pregunta.
- Si disparas a una equivocada: **pierdes una vida** y se explica el error.
- Si la respuesta correcta cruza la línea roja: también pierdes una vida.
- Empiezas con **3 vidas**. Al despejar un sector ganas una vida extra (máximo 3).
- Al quedarte sin vidas, fin de la partida. El récord se guarda en `localStorage`.

![Partida del arcade](/jrubioastigarraga/la-web-por-dentro/raw/main/docs/arcade.png)

**Presentación arcade**

- Mar con scroll vertical, islas, nubes y espuma en varias capas de parallax.
- Aviones dibujados a mano en canvas, con hélice giratoria, sombra y luces de alas.
- Explosiones con bola de fuego, humo, metralla, onda expansiva y flash de daño.
- HUD de recreativa dentro de la pantalla: `1UP`, puntuación, vidas, progreso y rótulos de `STAGE`.
- Cada sector cambia la luz del océano (día, atardecer, crepúsculo, frío y amanecer).

**Realidad virtual**

- Abre la URL en el navegador del visor (probado con Meta Quest y **Pico 4**) y pulsa **Enter VR**.
- Apunta con el mando y pulsa el gatillo para derribar el avión señalado.
- Todo ocurre en una pantalla holográfica a 1,5 m: sin locomoción artificial y sin mareo.
- El render se limita a 1,5× de densidad de píxeles para mantener 72/90 fps en visores móviles.

## Los cinco sectores

[](#los-cinco-sectores)

| \# | Sector | Contenido | Módulo DAW |
| --- | --- | --- | --- |
| 1 | **Despliegue** | DNS, HTTPS, códigos de estado, balanceadores y build | Despliegue de aplicaciones web / Sistemas informáticos |
| 2 | **CSS** | Modelo de caja, selectores, flex, unidades y responsive | Desarrollo web en entorno cliente / Diseño de interfaces |
| 3 | **Git** | Ramas, merges, comandos, stash, revert y merge base | Entornos de desarrollo |
| 4 | **Bases de datos** | SQL, claves, JOIN, tipos y transacciones | Bases de datos |
| 5 | **Accesibilidad** | HTML semántico, foco, ARIA, contraste y WCAG | Diseño de interfaces web |

Cada sector tiene **10 preguntas** en su banco, con **4 opciones** cada una. En cada partida se eligen **6 al azar** y también se barajan las opciones, así que se puede rejugar sin repetir.

## Idioma

El botón **ES / EU** de la barra superior cambia toda la interfaz: menú, panel de juego, mensajes, botones y avisos. Las preguntas usan su traducción al euskera si existe (`qEu`, `optionsEu`, `whyEu` en `questions.js`) y, si no, se muestran en castellano. Las preguntas cargadas desde Moodle se muestran tal como estén escritas en el banco.

## Preguntas desde Moodle

En la pantalla inicial, el botón **Moodle** permite cargar preguntas de un cuestionario concreto antes de jugar:

1. Instala una sola vez el endpoint `moodle/local/lwpd/questions.php` en tu Moodle y configura allí los cuestionarios permitidos (ver [`moodle/README.md`](/jrubioastigarraga/la-web-por-dentro/blob/main/moodle/README.md)).
2. En el juego, pulsa **Moodle** y escribe:
   - el servidor (`https://moodle.lhusurbil.eus`),
   - el **ID del cuestionario** (`cmid`) o, si lo prefieres, los IDs de preguntas,
   - la clave solo si la has configurado.
3. **Cargar y jugar**: el juego pide las preguntas de ese cuestionario, las reparte y empieza.

Cada pregunta se convierte en **una pantalla (`STAGE`) independiente**. Si el cuestionario tiene 5 preguntas, jugarás 5 pantallas.

También puedes configurarlo por enlace, cómodo en Pico 4: `?quiz=1234&start=1` (y `#key=...` solo la primera vez).

Moodle no ofrece un Web Service estándar para pedir una pregunta por ID, por eso se usa ese pequeño endpoint de solo lectura (con CORS y clave opcional). Solo se admiten preguntas de tipo **multichoice** y **truefalse**.

## Modos

[](#modos)

- **Jugar campaña:** los cinco sectores seguidos con 3 vidas.
- **Practicar un sector:** una partida corta de una sola asignatura, ideal para repasar en clase.
- **Moodle:** una partida con las preguntas que indiques por ID.

## Desarrollo

[](#desarrollo)

Requiere Node 20.19+ o 22+.

```
npm install
npm run dev      # http://localhost:5173
npm run build    # genera dist/
npm run preview  # sirve dist/
```

### Estructura

```
src/
  main.js              bucle, cámara, raycasting, mandos VR y pantallas
  menu.js              pantalla de inicio y selección de sector
  hud.js               panel de instrucciones del menú
  i18n.js              textos ES/EU y ayudas de traducción
  moodle.js            carga de preguntas por ID desde Moodle
  util.js              tarjetas, etiquetas, audio y utilidades
  arcade/
    questions.js       bancos de preguntas de las cinco asignaturas
    art.js             mar con scroll, aviones, marcos, HUD y texturas
    game.js            motor del arcade: oleadas, disparos, vidas y sectores
moodle/
  local/lwpd/questions.php   endpoint de solo lectura para Moodle
```

### Añadir o cambiar preguntas

Todo está en `src/arcade/questions.js`. Cada pregunta tiene esta forma:

```js
{
  q: '¿Qué código HTTP indica un fallo del servidor?',
  options: ['500', '404', '301'],
  correct: 0,          // índice de la opción correcta
  why: '500 es un error interno del servidor.',
}
```

La respuesta correcta se baraja en cada oleada: `correct` solo indica cuál es,
nunca se muestra en una posición fija ni con un color distinto.

Para cambiar cuántas preguntas tiene cada partida, ajusta `QUESTIONS_PER_SECTOR`
al principio del mismo archivo.

## Despliegue

[](#despliegue)

El workflow [`.github/workflows/deploy.yml`](/jrubioastigarraga/la-web-por-dentro/blob/main/.github/workflows/deploy.yml) compila y publica en GitHub Pages en cada push a `main`.

Para activarlo en un fork: **Settings → Pages → Source: GitHub Actions**.

## Accesibilidad y comodidad

[](#accesibilidad-y-comodidad)

- Texto de alto contraste y tamaños pensados para leerse a ~1 m.
- Preguntas y respuestas siempre visibles: el juego evalúa comprensión, no memoria visual.
- Interacción por rayo (ratón o mando), sin necesidad de agarrar objetos.
- Sin movimiento de cámara artificial; el jugador puede mirar libremente.
- Récord persistente y botón para borrarlo.
- Alternativa de práctica por asignatura para sesiones cortas.

## Licencia

[](#licencia)

MIT. Úsalo, modifícalo y llévalo a tu aula.
