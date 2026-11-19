/**
 * Banco de preguntas local (respaldo y práctica sin Moodle).
 *
 * 10 preguntas por asignatura, 4 opciones cada una. El juego baraja tanto las
 * preguntas como las opciones, así que el índice `correct` solo indica cuál es
 * la buena en este fichero.
 *
 * Traducciones: si una pregunta tiene `qEu`, `optionsEu` y `whyEu`, se usa la
 * versión en euskera al elegir ese idioma. Si no existen, se muestra el texto
 * en castellano.
 */

export const QUESTIONS_PER_SECTOR = 6;

export const SECTORS = [
  {
    id: 'http',
    title: 'Despliegue',
    titleEu: 'Inplementazioa',
    tag: 'HTTP · DNS · servidores',
    tagEu: 'HTTP · DNS · zerbitzariak',
    tone: '#4de2c5',
    color: 0x4de2c5,
    brief:
      'El escuadrón cruza la red. Derriba la respuesta correcta sobre DNS, HTTPS, códigos de estado y despliegue.',
    briefEu:
      'Eskadroia sarean zehar doa. Bota erantzun zuzena DNS, HTTPS, egoera-kode eta inplementazioari buruz.',
    questions: [
      {
        q: '¿Qué registro DNS asocia un nombre a una dirección IPv4?',
        options: ['A', 'AAAA', 'MX', 'CNAME'],
        correct: 0,
        why: 'El registro A asocia un nombre a una IPv4.',
      },
      {
        q: '¿En qué puerto escucha HTTPS por defecto?',
        options: ['443', '80', '22', '3306'],
        correct: 0,
        why: 'HTTPS usa el 443 y cifra con TLS.',
      },
      {
        q: '¿En qué puerto escucha HTTP por defecto?',
        options: ['80', '443', '21', '3306'],
        correct: 0,
        why: 'HTTP sin cifrar usa el 80.',
      },
      {
        q: '¿Qué código HTTP significa "No encontrado"?',
        options: ['404', '200', '500', '301'],
        correct: 0,
        why: '404 indica que el recurso pedido no existe.',
      },
      {
        q: '¿Qué código HTTP indica un fallo del servidor?',
        options: ['500', '404', '301', '200'],
        correct: 0,
        why: '500 es un error interno del servidor.',
      },
      {
        q: '¿Qué código HTTP es una redirección permanente?',
        options: ['301', '200', '404', '429'],
        correct: 0,
        why: '301 mueve el recurso de forma permanente.',
      },
      {
        q: '¿Qué hace TLS?',
        options: ['Cifra la conexión', 'Resuelve dominios', 'Reparte tráfico', 'Comprime imágenes'],
        correct: 0,
        why: 'TLS cifra la conexión; antes se llamaba SSL.',
      },
      {
        q: '¿Qué hace un balanceador de carga?',
        options: ['Reparte peticiones', 'Cifra el correo', 'Compila el CSS', 'Resuelve dominios'],
        correct: 0,
        why: 'Reparte las peticiones entre varios servidores.',
      },
      {
        q: '¿Qué carpeta genera `npm run build` en Vite?',
        options: ['dist/', 'src/', 'public/', 'node_modules/'],
        correct: 0,
        why: 'Vite compila la aplicación en dist/.',
      },
      {
        q: '¿Qué código HTTP es "Acceso prohibido"?',
        options: ['403', '200', '404', '500'],
        correct: 0,
        why: '403 indica que no tienes permiso para ese recurso.',
      },
    ],
  },
  {
    id: 'css',
    title: 'CSS',
    titleEu: 'CSS',
    tag: 'Cliente · modelo de caja · flex',
    tagEu: 'Bezeroa · kaxa-eredua · flex',
    tone: '#ffb454',
    color: 0xffb454,
    brief:
      'El escuadrón entra en el motor del navegador. Derriba la respuesta correcta sobre cajas, selectores y flex.',
    briefEu:
      'Eskadroia nabigatzailearen motorrean sartu da. Bota erantzun zuzena kaxei, hautatzaileei eta flexi buruz.',
    questions: [
      {
        q: '¿Qué propiedad cambia el color del texto?',
        options: ['color', 'background', 'border', 'font-size'],
        correct: 0,
        why: 'color pinta el texto; background pinta el fondo.',
      },
      {
        q: '¿Qué propiedad crea espacio interior?',
        options: ['padding', 'margin', 'gap', 'border'],
        correct: 0,
        why: 'padding separa el contenido del borde.',
      },
      {
        q: '¿Qué propiedad crea espacio exterior?',
        options: ['margin', 'padding', 'gap', 'border'],
        correct: 0,
        why: 'margin separa la caja de las demás.',
      },
      {
        q: '¿Qué display crea una fila flexible?',
        options: ['flex', 'block', 'inline', 'none'],
        correct: 0,
        why: 'flex alinea los hijos en un eje flexible.',
      },
      {
        q: '¿Qué propiedad centra en el eje principal?',
        options: ['justify-content', 'align-items', 'flex-wrap', 'order'],
        correct: 0,
        why: 'justify-content reparte el eje principal.',
      },
      {
        q: '¿Qué propiedad centra en el eje cruzado?',
        options: ['align-items', 'justify-content', 'order', 'flex-wrap'],
        correct: 0,
        why: 'align-items alinea en el eje cruzado.',
      },
      {
        q: '¿Qué unidad es relativa al tamaño raíz?',
        options: ['rem', 'px', 'vh', 'vw'],
        correct: 0,
        why: 'rem se calcula sobre el font-size del html.',
      },
      {
        q: '¿Qué selector apunta a un id?',
        options: ['#id', '.clase', '*', 'tag'],
        correct: 0,
        why: 'La almohadilla (#) selecciona un id.',
      },
      {
        q: '¿Qué regla aplica estilos según el ancho?',
        options: ['@media', '@import', '@font-face', '@keyframes'],
        correct: 0,
        why: '@media permite diseño responsive.',
      },
      {
        q: '¿Qué posición se queda fija al hacer scroll?',
        options: ['sticky', 'static', 'relative', 'absolute'],
        correct: 0,
        why: 'sticky pega el elemento al hacer scroll.',
      },
    ],
  },
  {
    id: 'git',
    title: 'Git',
    titleEu: 'Git',
    tag: 'Entornos · ramas · merges',
    tagEu: 'Inguruneak · adarrak · mergeak',
    tone: '#a78bfa',
    color: 0xa78bfa,
    brief:
      'El escuadrón patrulla el grafo de commits. Derriba la respuesta correcta sobre ramas, merges y comandos.',
    briefEu:
      'Eskadroia commiten grafoan zehar ibiltzen da. Bota erantzun zuzena adar, merge eta komenduei buruz.',
    questions: [
      {
        q: '¿Qué comando registra los cambios?',
        options: ['git commit', 'git push', 'git log', 'git add'],
        correct: 0,
        why: 'commit guarda una instantánea en el historial.',
      },
      {
        q: '¿Qué comando sube los cambios al remoto?',
        options: ['git push', 'git pull', 'git fetch', 'git clone'],
        correct: 0,
        why: 'push envía los commits al remoto.',
      },
      {
        q: '¿Qué comando trae y fusiona?',
        options: ['git pull', 'git fetch', 'git clone', 'git merge'],
        correct: 0,
        why: 'pull es fetch + merge.',
      },
      {
        q: '¿Qué comando descarga sin fusionar?',
        options: ['git fetch', 'git pull', 'git merge', 'git clone'],
        correct: 0,
        why: 'fetch trae los cambios pero no los aplica.',
      },
      {
        q: '¿Qué comando cambia de rama?',
        options: ['git switch', 'git status', 'git diff', 'git log'],
        correct: 0,
        why: 'switch (o checkout) cambia la rama activa.',
      },
      {
        q: '¿Qué comando fusiona ramas?',
        options: ['git merge', 'git branch', 'git clone', 'git add'],
        correct: 0,
        why: 'merge integra otra rama en la actual.',
      },
      {
        q: '¿Qué comando guarda cambios temporalmente?',
        options: ['git stash', 'git commit', 'git revert', 'git add'],
        correct: 0,
        why: 'stash aparta cambios para recuperarlos después.',
      },
      {
        q: '¿Qué comando deshace un commit ya publicado?',
        options: ['git revert', 'git reset', 'git stash', 'git clean'],
        correct: 0,
        why: 'revert crea un commit que deshace otro.',
      },
      {
        q: '¿Qué es el merge base?',
        options: ['El ancestro común', 'La rama nueva', 'El último tag', 'El primer commit'],
        correct: 0,
        why: 'Es el commit del que parten las dos ramas.',
      },
      {
        q: '¿Qué comando copia un repositorio?',
        options: ['git clone', 'git init', 'git fork', 'git fetch'],
        correct: 0,
        why: 'clone descarga una copia completa del repositorio.',
      },
    ],
  },
  {
    id: 'bbdd',
    title: 'Bases de datos',
    titleEu: 'Datu baseak',
    tag: 'SQL · claves · JOIN',
    tagEu: 'SQL · gakoak · JOIN',
    tone: '#60a5fa',
    color: 0x60a5fa,
    brief:
      'El escuadrón sobrevuela el almacén de datos. Derriba la respuesta correcta sobre SQL, claves y JOIN.',
    briefEu:
      'Eskadroia datu biltegian zehar hegan doa. Bota erantzun zuzena SQL, gako eta JOINei buruz.',
    questions: [
      {
        q: '¿Qué sentencia lee datos?',
        options: ['SELECT', 'INSERT', 'DELETE', 'UPDATE'],
        correct: 0,
        why: 'SELECT consulta filas de una tabla.',
      },
      {
        q: '¿Qué sentencia inserta filas?',
        options: ['INSERT', 'UPDATE', 'SELECT', 'DELETE'],
        correct: 0,
        why: 'INSERT añade filas nuevas.',
      },
      {
        q: '¿Qué sentencia modifica filas?',
        options: ['UPDATE', 'DELETE', 'INSERT', 'SELECT'],
        correct: 0,
        why: 'UPDATE cambia valores existentes.',
      },
      {
        q: '¿Qué cláusula filtra filas?',
        options: ['WHERE', 'ORDER BY', 'GROUP BY', 'LIMIT'],
        correct: 0,
        why: 'WHERE aplica la condición a cada fila.',
      },
      {
        q: '¿Qué cláusula ordena el resultado?',
        options: ['ORDER BY', 'WHERE', 'LIMIT', 'GROUP BY'],
        correct: 0,
        why: 'ORDER BY ordena por una o varias columnas.',
      },
      {
        q: '¿Qué cláusula agrupa filas?',
        options: ['GROUP BY', 'ORDER BY', 'WHERE', 'LIMIT'],
        correct: 0,
        why: 'GROUP BY agrupa para funciones de agregado.',
      },
      {
        q: '¿Qué JOIN devuelve solo las coincidencias?',
        options: ['INNER JOIN', 'LEFT JOIN', 'CROSS JOIN', 'RIGHT JOIN'],
        correct: 0,
        why: 'INNER JOIN descarta las filas sin pareja.',
      },
      {
        q: '¿Qué JOIN conserva toda la tabla izquierda?',
        options: ['LEFT JOIN', 'INNER JOIN', 'RIGHT JOIN', 'CROSS JOIN'],
        correct: 0,
        why: 'LEFT JOIN deja la izquierda y rellena con NULL.',
      },
      {
        q: '¿Qué clave identifica cada fila?',
        options: ['PRIMARY KEY', 'FOREIGN KEY', 'INDEX', 'UNIQUE'],
        correct: 0,
        why: 'La clave primaria es única y no nula.',
      },
      {
        q: '¿Qué clave enlaza con otra tabla?',
        options: ['FOREIGN KEY', 'PRIMARY KEY', 'UNIQUE', 'INDEX'],
        correct: 0,
        why: 'La clave foránea referencia otra tabla.',
      },
    ],
  },
  {
    id: 'a11y',
    title: 'Accesibilidad',
    titleEu: 'Irisgarritasuna',
    tag: 'Interfaces · foco · ARIA',
    tagEu: 'Interfazeak · fokua · ARIA',
    tone: '#f472b6',
    color: 0xf472b6,
    brief:
      'El escuadrón protege la interfaz. Derriba la respuesta correcta sobre HTML semántico, foco y contraste.',
    briefEu:
      'Eskadroia interfazea babesten du. Bota erantzun zuzena HTML semantiko, foku eta kontrasteari buruz.',
    questions: [
      {
        q: '¿Qué atributo describe una imagen?',
        options: ['alt', 'src', 'title', 'role'],
        correct: 0,
        why: 'alt da el texto alternativo de la imagen.',
      },
      {
        q: '¿Qué elemento es el encabezado principal?',
        options: ['h1', 'h6', 'p', 'header'],
        correct: 0,
        why: 'h1 es el título de mayor nivel.',
      },
      {
        q: '¿Qué etiqueta asocia texto a un campo?',
        options: ['label', 'legend', 'span', 'small'],
        correct: 0,
        why: 'label se asocia al campo con for/id.',
      },
      {
        q: '¿Qué atributo nombra un botón para lectores?',
        options: ['aria-label', 'alt', 'lang', 'title'],
        correct: 0,
        why: 'aria-label aporta el nombre accesible.',
      },
      {
        q: '¿Qué contraste mínimo pide WCAG AA?',
        options: ['4.5:1', '1.5:1', '10:1', '2:1'],
        correct: 0,
        why: 'AA exige 4.5:1 en texto normal.',
      },
      {
        q: '¿Qué tecla recorre los elementos enfocables?',
        options: ['Tab', 'Esc', 'Ctrl', 'Alt'],
        correct: 0,
        why: 'Tab mueve el foco en orden de documento.',
      },
      {
        q: '¿Qué elemento agrupa la navegación?',
        options: ['nav', 'main', 'footer', 'aside'],
        correct: 0,
        why: 'nav marca la zona de navegación.',
      },
      {
        q: '¿Qué elemento marca el contenido principal?',
        options: ['main', 'nav', 'aside', 'footer'],
        correct: 0,
        why: 'main contiene el contenido central.',
      },
      {
        q: '¿Qué atributo declara el idioma de la página?',
        options: ['lang', 'dir', 'charset', 'role'],
        correct: 0,
        why: 'lang ayuda a los lectores de pantalla.',
      },
      {
        q: '¿Qué hace falta para navegar solo con teclado?',
        options: ['Foco visible', 'Más colores', 'Animaciones', 'Vídeo automático'],
        correct: 0,
        why: 'Sin indicador de foco el usuario se pierde.',
      },
    ],
  },
];
