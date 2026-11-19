/**
 * Endpoint de solo lectura para "Escuadrón Web".
 *
 * Devuelve preguntas del banco de Moodle en JSON plano:
 *   GET /local/lwpd/questions.php?ids=101,102,103
 *   Header: X-LWPD-Key: TU_CLAVE
 *
 * Respuesta:
 *   {"questions":[{"id":101,"q":"...","options":["a","b"],"correct":0,"why":"..."}]}
 *
 * Solo admite preguntas de tipo multichoice y truefalse.
 */

/* -------------------------------------------------------------------------
 * CONFIGURACIÓN OBLIGATORIA
 * ---------------------------------------------------------------------- */

// Clave larga y aleatoria. Sin esto el endpoint queda desactivado.
define('LWPD_KEY', '');

// Origen permitido para el navegador. Ejemplo:
//   define('LWPD_ALLOWED_ORIGIN', 'https://jrubioastigarraga.github.io');
// Si se deja vacío, se acepta cualquier origen (menos seguro).
define('LWPD_ALLOWED_ORIGIN', '');

// Lista blanca opcional de IDs. Si se rellena, solo se sirven esos IDs.
// Ejemplo: define('LWPD_ALLOWED_IDS', '101,102,103,104');
define('LWPD_ALLOWED_IDS', '');

/* ---------------------------------------------------------------------- */

$allowedOrigin = LWPD_ALLOWED_ORIGIN;
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: X-LWPD-Key, Content-Type');

if ($allowedOrigin !== '') {
    header('Access-Control-Allow-Origin: ' . $allowedOrigin);
    header('Vary: Origin');
} else {
    header('Access-Control-Allow-Origin: *');
}

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

require_once(__DIR__ . '/../../config.php');

function lwpd_plain($html) {
    $text = html_entity_decode(strip_tags((string)$html), ENT_QUOTES | ENT_HTML5, 'UTF-8');
    $text = str_replace(["\xC2\xA0", "\n", "\r", "\t"], ' ', $text);
    return trim(preg_replace('/\s+/u', ' ', $text));
}

function lwpd_fail($code, $status = 400) {
    http_response_code($status);
    echo json_encode(['error' => $code], JSON_UNESCAPED_UNICODE);
    exit;
}

// Sin clave configurada no se sirve nada.
if (LWPD_KEY === '') {
    lwpd_fail('endpoint-not-configured', 503);
}

// Origen: si hay cabecera Origin y no coincide, se rechaza.
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($allowedOrigin !== '' && $origin !== '' && $origin !== $allowedOrigin) {
    lwpd_fail('forbidden-origin', 403);
}

// La clave viaja en cabecera (no en la URL) para no dejarla en los logs.
$key = $_SERVER['HTTP_X_LWPD_KEY'] ?? '';
if ($key === '') {
    $key = optional_param('key', '', PARAM_TEXT);
}
if (!hash_equals(LWPD_KEY, $key)) {
    lwpd_fail('forbidden', 403);
}

$raw = optional_param('ids', '', PARAM_TEXT);
$ids = [];
foreach (preg_split('/[^0-9]+/', $raw) as $chunk) {
    if ($chunk !== '') {
        $ids[] = (int)$chunk;
    }
}
$ids = array_slice(array_values(array_unique($ids)), 0, 30);
if (!$ids) {
    lwpd_fail('missing-ids');
}

$allowedIds = array_values(array_filter(array_map('intval', preg_split('/[^0-9]+/', LWPD_ALLOWED_IDS))));
if ($allowedIds) {
    $ids = array_values(array_intersect($ids, $allowedIds));
    if (!$ids) {
        lwpd_fail('id-not-allowed', 403);
    }
}

$dbman = $DB->get_manager();
$hasentries = $dbman->table_exists('question_bank_entries');
$hasversions = $dbman->table_exists('question_versions');

$questions = [];

foreach ($ids as $id) {
    $question = $DB->get_record('question', ['id' => $id], '*', IGNORE_MISSING);

    // Si el ID es de la entrada del banco de preguntas, busca su última versión.
    if (!$question && $hasentries && $hasversions) {
        $sql = "SELECT q.*
                  FROM {question_versions} v
                  JOIN {question} q ON q.id = v.questionid
                 WHERE v.questionbankentryid = :entryid
              ORDER BY v.version DESC";
        $question = $DB->get_record_sql($sql, ['entryid' => $id], IGNORE_MULTIPLE);
    }

    if (!$question) {
        continue;
    }
    if (!in_array($question->qtype, ['multichoice', 'truefalse'], true)) {
        continue;
    }

    $answers = $DB->get_records('question_answers', ['question' => $question->id], 'id ASC');
    if (count($answers) < 2) {
        continue;
    }

    $options = [];
    $correct = 0;
    $best = -1;
    foreach ($answers as $answer) {
        $options[] = lwpd_plain($answer->answer);
        $fraction = (float)$answer->fraction;
        if ($fraction > $best) {
            $best = $fraction;
            $correct = count($options) - 1;
        }
    }

    $questions[] = [
        'id' => (int)$question->id,
        'q' => lwpd_plain($question->questiontext),
        'options' => $options,
        'correct' => $correct,
        'why' => lwpd_plain($question->generalfeedback),
    ];
}

echo json_encode(['questions' => $questions], JSON_UNESCAPED_UNICODE);
