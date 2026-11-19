const STORAGE_KEY = 'lwpd.moodle.v1';

const DEFAULTS = {
  base: 'https://moodle.lhusurbil.eus',
  key: '',
  ids: '',
};

export function loadMoodleConfig() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return {
      base: String(raw.base || DEFAULTS.base).replace(/\/+$/, ''),
      key: String(raw.key || ''),
      ids: String(raw.ids || ''),
    };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveMoodleConfig(config) {
  const clean = {
    base: String(config.base || DEFAULTS.base)
      .trim()
      .replace(/\/+$/, ''),
    key: String(config.key || '').trim(),
    ids: String(config.ids || '').trim(),
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
  } catch {
    /* sin almacenamiento */
  }
  return clean;
}

export function parseIds(text) {
  return String(text || '')
    .split(/[^0-9]+/)
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value) && value > 0);
}

function plain(value) {
  const text = String(value ?? '');
  if (!text) return '';
  try {
    const doc = new DOMParser().parseFromString(text, 'text/html');
    return (doc.body.textContent || '').replace(/\s+/g, ' ').trim();
  } catch {
    return text
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
}

function shuffle(list) {
  const out = list.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Normaliza una pregunta de Moodle al formato del juego:
 * texto corto, entre 2 y 4 opciones y una sola correcta.
 */
export function normalizeQuestion(raw) {
  if (!raw) return null;
  const text = plain(raw.q ?? raw.question ?? raw.text);
  if (!text) return null;

  const options = (raw.options || raw.answers || [])
    .map((option) =>
      plain(typeof option === 'string' ? option : option.text ?? option.answer)
    )
    .filter(Boolean);

  if (options.length < 2) return null;

  let correctIndex = Number(raw.correct ?? raw.correctIndex ?? 0);
  if (!Number.isInteger(correctIndex) || correctIndex < 0) correctIndex = 0;
  correctIndex = Math.min(correctIndex, options.length - 1);

  const correctText = options[correctIndex];
  const rest = shuffle(options.filter((_, index) => index !== correctIndex));
  const chosen = [correctText, ...rest.slice(0, 3)];
  const mixed = shuffle(chosen);

  return {
    id: raw.id,
    q: text,
    options: mixed,
    correct: mixed.indexOf(correctText),
    why: plain(raw.why ?? raw.feedback) || `Respuesta correcta: ${correctText}`,
  };
}

export async function fetchMoodleQuestions(config) {
  const ids = parseIds(config.ids);
  if (!ids.length) throw new Error('missing-ids');

  const base = String(config.base || DEFAULTS.base)
    .trim()
    .replace(/\/+$/, '');
  const url = new URL(`${base}/local/lwpd/questions.php`);
  url.searchParams.set('ids', ids.join(','));
  if (config.key) url.searchParams.set('key', config.key);

  const response = await fetch(url.toString(), { cache: 'no-store' });
  if (!response.ok) throw new Error(`http-${response.status}`);

  const data = await response.json();
  if (!data || data.error) {
    throw new Error((data && data.error) || 'invalid-response');
  }

  const list = (data.questions || [])
    .map(normalizeQuestion)
    .filter(Boolean);

  if (!list.length) throw new Error('no-questions');
  return list;
}
