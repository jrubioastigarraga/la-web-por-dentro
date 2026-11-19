<?php
/**
 * Endpoint de solo lectura para "Escuadrón Web".
 *
 * Devuelve preguntas del banco de Moodle en JSON plano:
 *   GET /local/lwpd/questions.php?ids=101,102,103&key=OPCIONAL
 *
 * Respuesta:
 *   {"questions":[{"id":101,"q":"...","options":["a","b"],"correct":0,"why":"..."}]}
 *
 * Solo admite preguntas de tipo multichoice y truefalse.
 * No requiere sesión, pero se recomienda definir KEY para limitar el acceso.
 */

define('LWPD_KEY', ''); // Pon aquí una clave y configúrala también en el juego.

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Cache-Control: no-store');

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

$key = optional_param('key', '', PARAM_TEXT);
if (LWPD_KEY !== '' && !hash_equals(LWPD_KEY, $key)) {
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
