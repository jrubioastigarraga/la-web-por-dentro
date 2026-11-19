const STORAGE_KEY = 'lwpd.lang';

export const LANGS = ['es', 'eu'];

const STRINGS = {
  es: {
    /* menú */
    play: 'Jugar campaña',
    practice: 'Practicar un sector',
    questions: 'preguntas',
    campaignInfo: 'Campaña: 5 sectores · 6 preguntas por sector',
    record: 'Récord personal',
    sectorsCleared: 'sectores despejados',
    menuTitle: 'ESCUADRÓN WEB',
    menuSubtitle: 'LA WEB POR DENTRO · ARCADE DAW',
    menuBody:
      'Derriba la respuesta correcta antes de que cruce la línea. Si disparas a una equivocada, pierdes una vida. Tres vidas y cinco sectores.',
    menuFoot: 'Campaña: 5 sectores · 6 preguntas por sector',

    /* juego */
    tagQuestion: 'PREGUNTA',
    tagCorrect: 'CORRECTO',
    tagFail: 'FALLO',
    sectorLabel: 'SECTOR',
    livesLabel: 'VIDAS',
    questionsLabel: 'PREGUNTAS',
    stageName: 'STAGE',
    practiceName: 'PRÁCTICA',
    stageClear: 'STAGE CLEAR',
    extraLife: 'VIDA EXTRA',
    pointsShort: 'PTS',
    pointsWord: 'PUNTOS',
    correctKill: '¡Derribado!',
    wrongKill: '¡Ese no era!',
    correctWas: 'La respuesta correcta era',
    escaped: 'Se escapó la respuesta correcta.',
    wasShort: 'Era',
    combo: 'COMBO',
    gameOver: 'FIN DE LA PARTIDA',
    downMessage: 'El escuadrón ha caído con {score} puntos. Vuelve a intentarlo.',
    missionDone: 'MISIÓN CUMPLIDA',
    practiceDone: 'PRÁCTICA COMPLETADA',
    campaignDone: 'CAMPAÑA COMPLETADA',
    downTitle: 'ESCUADRÓN DERRIBADO',
    retry: 'REINTENTAR',
    menuButton: 'MENÚ',
    resultPractice: 'Práctica de {sector}',
    resultCampaign: '{done} de {total} sectores despejados',
    resultFoot: '{score} PUNTOS · RÉCORD {best}',
    practiceMessage: 'Práctica de {sector} completada con {score} puntos.',
    allDoneMessage: 'Los cinco sectores están despejados con {score} puntos.',
    newSectorMessage: 'Sector {n} despejado. +250 pts y una vida extra.',
    newSectorMessage2: 'Sector {n} despejado. +250 pts.',

    /* controles */
    back: '← Menú',
    reset: 'Borrar récord',
    hintMove: 'Mueve el ratón para pilotar · clic o ESPACIO para disparar',
    hintVR: 'En VR: apunta con el mando y pulsa el gatillo',
    resetConfirm: '¿Borrar el récord y los sectores despejados?',

    /* moodle */
    moodle: 'Moodle',
    moodleTitle: 'Preguntas de Moodle',
    moodleServer: 'Servidor',
    moodleKey: 'Clave de acceso',
    moodleQuiz: 'Cuestionario (cmid)',
    moodleQuizHint:
      'ID del cuestionario en Moodle (mod/quiz/view.php?id=...). Si lo pones, se cargan todas sus preguntas.',
    moodleIds: 'IDs de preguntas',
    moodleIdsHint:
      'Solo si no usas el ID del cuestionario. Sepáralos por comas.',
    moodlePlay: 'Cargar y jugar',
    moodleTest: 'Probar',
    moodleClose: 'Cerrar',
    moodleLocal: 'Jugar con banco local',
    moodleLoading: 'Cargando preguntas…',
    moodleError: 'No se han podido cargar las preguntas.',
    moodleReady: '{n} preguntas cargadas.',
    moodleNeedIds: 'Escribe el ID del cuestionario o al menos una ID.',
    moodleNoConfig: 'Configura Moodle para jugar con tus preguntas.',
    moodleHint: 'Pulsa Moodle en la barra superior antes de entrar en VR.',
    moodleMode: 'Moodle · {n} preguntas',
    moodleQuestion: 'Pregunta {n} de {total}',
    moodleDone: 'MOODLE COMPLETADO',
    moodleResult: '{done} de {total} pantallas',
    moodleMessage:
      'Moodle completado: {done} de {total} pantallas y {score} puntos.',
  },
  eu: {
    /* menua */
    play: 'Jolastu kanpaina',
    practice: 'Praktikatu sektore bat',
    questions: 'galdera',
    campaignInfo: 'Kanpaina: 5 sektore · 6 galdera sektoreko',
    record: 'Errekor pertsonala',
    sectorsCleared: 'sektore garbituak',
    menuTitle: 'ESCUADRÓN WEB',
    menuSubtitle: 'LA WEB POR DENTRO · ARCADE DAW',
    menuBody:
      'Bota erantzun zuzena marra zeharkatu aurretik. Erantzun oker bat botatzen baduzu, bizitza bat galduko duzu. Hiru bizitza eta bost sektore.',
    menuFoot: 'Kanpaina: 5 sektore · 6 galdera sektoreko',

    /* jokoa */
    tagQuestion: 'GALDERA',
    tagCorrect: 'ZUZENA',
    tagFail: 'AKATSA',
    sectorLabel: 'SEKTOREA',
    livesLabel: 'BIZITZAK',
    questionsLabel: 'GALDERAK',
    stageName: 'STAGE',
    practiceName: 'PRAKTIKA',
    stageClear: 'STAGE CLEAR',
    extraLife: 'BIZITZA EXTRA',
    pointsShort: 'PT',
    pointsWord: 'PUNTU',
    correctKill: 'Botata!',
    wrongKill: 'Hori ez zen!',
    correctWas: 'Erantzun zuzena hau zen',
    escaped: 'Erantzun zuzenak ihes egin du.',
    wasShort: 'Hau zen',
    combo: 'KONBOA',
    gameOver: 'PARTIDA AMAITU DA',
    downMessage: 'Eskadroia {score} punturekin erori da. Saiatu berriro.',
    missionDone: 'MISIOA BETETA',
    practiceDone: 'PRAKTIKA AMAITUTA',
    campaignDone: 'KANPAINA AMAITUTA',
    downTitle: 'ESKADROIA ERAITSITA',
    retry: 'BERRIRO SAIATU',
    menuButton: 'MENUA',
    resultPractice: '{sector} praktika',
    resultCampaign: '{done} / {total} sektore garbituak',
    resultFoot: '{score} PUNTU · ERREKORRA {best}',
    practiceMessage: '{sector} praktika {score} punturekin amaituta.',
    allDoneMessage: 'Bost sektoreak garbituta, {score} punturekin.',
    newSectorMessage: '{n}. sektorea garbituta. +250 pt eta bizitza extra.',
    newSectorMessage2: '{n}. sektorea garbituta. +250 pt.',

    /* kontrolak */
    back: '← Menua',
    reset: 'Errekorra ezabatu',
    hintMove: 'Mugitu sagua gidatzeko · klik edo ESPAZIOA tiratzeko',
    hintVR: 'VR-n: seinalatu agintearekin eta sakatu triggerra',
    resetConfirm: 'Errekorra eta garbitutako sektoreak ezabatu?',

    /* moodle */
    moodle: 'Moodle',
    moodleTitle: 'Moodleko galderak',
    moodleServer: 'Zerbitzaria',
    moodleKey: 'Sarbide-gakoa',
    moodleQuiz: 'Galdetegia (cmid)',
    moodleQuizHint:
      'Moodlen duen galdetegiaren IDa (mod/quiz/view.php?id=...). Hau betetzen baduzu, galdetegiaren galdera guztiak kargatuko dira.',
    moodleIds: 'Galderen IDak',
    moodleIdsHint:
      'Soilik galdetegiaren IDa erabiltzen ez baduzu. Banatu komaz.',
    moodlePlay: 'Kargatu eta jolastu',
    moodleTest: 'Probatu',
    moodleClose: 'Itxi',
    moodleLocal: 'Jolastu tokiko bankuarekin',
    moodleLoading: 'Galderak kargatzen…',
    moodleError: 'Ezin izan dira galderak kargatu.',
    moodleReady: '{n} galdera kargatuta.',
    moodleNeedIds: 'Idatzi galdetegiaren IDa edo gutxienez ID bat.',
    moodleNoConfig: 'Konfiguratu Moodle zure galderak erabiltzeko.',
    moodleHint: 'Sakatu Moodle goiko barran VRra sartu aurretik.',
    moodleMode: 'Moodle · {n} galdera',
    moodleQuestion: '{n}. galdera, {total}tik',
    moodleDone: 'MOODLE AMAITUTA',
    moodleResult: '{done} / {total} pantaila',
    moodleMessage:
      'Moodle amaituta: {done} / {total} pantaila eta {score} puntu.',
  },
};

function normalizeLang(value) {
  return value === 'eu' ? 'eu' : 'es';
}

let current = 'es';
try {
  current = normalizeLang(localStorage.getItem(STORAGE_KEY));
} catch {
  current = 'es';
}

export function getLang() {
  return current;
}

export function setLang(lang) {
  current = normalizeLang(lang);
  try {
    localStorage.setItem(STORAGE_KEY, current);
  } catch {
    /* sin almacenamiento */
  }
  return current;
}

export function t(key, vars = {}) {
  const table = STRINGS[current] || STRINGS.es;
  let text = table[key] ?? STRINGS.es[key] ?? key;
  for (const [name, value] of Object.entries(vars)) {
    text = text.replaceAll(`{${name}}`, String(value));
  }
  return text;
}

/** Devuelve el texto en el idioma activo, con respaldo al castellano. */
export function pick(es, eu) {
  return current === 'eu' && eu ? eu : es;
}

export function sectorTitle(sector) {
  return pick(sector.title, sector.titleEu);
}

export function sectorTag(sector) {
  return pick(sector.tag, sector.tagEu);
}

export function sectorBrief(sector) {
  return pick(sector.brief, sector.briefEu);
}

/** Aplica las traducciones opcionales de una pregunta. */
export function localizeQuestion(question) {
  if (current !== 'eu') return question;
  return {
    ...question,
    q: question.qEu || question.q,
    options: question.optionsEu || question.options,
    why: question.whyEu || question.why,
  };
}

export function applyStaticText() {
  document.documentElement.lang = current;
  const back = document.getElementById('btn-back');
  if (back) back.textContent = t('back');
  const reset = document.getElementById('btn-reset');
  if (reset) reset.textContent = t('reset');
  const hint = document.getElementById('hint');
  if (hint) hint.innerHTML = `${t('hintMove')}<br />${t('hintVR')}`;
  const moodle = document.getElementById('btn-moodle');
  if (moodle) moodle.textContent = t('moodle');

  const set = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  };
  set('moodle-title', t('moodleTitle'));
  set('moodle-url-label', t('moodleServer'));
  set('moodle-key-label', t('moodleKey'));
  set('moodle-quiz-label', t('moodleQuiz'));
  set('moodle-quiz-hint', t('moodleQuizHint'));
  set('moodle-ids-label', t('moodleIds'));
  set('moodle-help', t('moodleIdsHint'));
  set('moodle-play', t('moodlePlay'));
  set('moodle-test', t('moodleTest'));
  set('moodle-close', t('moodleClose'));
  set('moodle-local', t('moodleLocal'));

  for (const button of document.querySelectorAll('[data-lang]')) {
    button.classList.toggle('on', button.dataset.lang === current);
  }
}
