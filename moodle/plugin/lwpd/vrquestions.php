<?php
// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

/**
 * Endpoint de solo lectura para "Escuadrón Web".
 *
 *   GET /local/lwpd/vrquestions.php?quiz=123
 *   GET /local/lwpd/vrquestions.php?quiz=auto
 *   GET /local/lwpd/vrquestions.php?ids=101,102,103
 *
 * Configuración: Administración del sitio → Plugins → Plugins locales →
 * "Escuadrón Web (preguntas)".
 */

require_once(__DIR__ . '/../../config.php');
require_once($CFG->dirroot . '/course/lib.php');

$quizids = (string)get_config('local_lwpd', 'quizids');
$extraids = (string)get_config('local_lwpd', 'allowedids');
$accesskey = (string)get_config('local_lwpd', 'key');
$allowedorigin = (string)get_config('local_lwpd', 'allowedorigin');
$requirelogin = (bool)get_config('local_lwpd', 'requirelogin');

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: X-LWPD-Key, Content-Type');

if ($allowedorigin !== '') {
    header('Access-Control-Allow-Origin: ' . $allowedorigin);
    header('Vary: Origin');
} else {
    header('Access-Control-Allow-Origin: *');
}

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

/* ------------------------------------------------------------------ utils */

function lwpd_ids($text) {
    $out = [];
    foreach (preg_split('/[^0-9]+/', (string)$text) as $chunk) {
        if ($chunk !== '') {
            $out[] = (int)$chunk;
        }
    }
    return array_values(array_unique($out));
}

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

/**
 * Comprueba que el cuestionario existe, está visible y su curso también.
 */
function lwpd_visible_quiz($cmid) {
    global $DB;
    $cm = get_coursemodule_from_id('quiz', (int)$cmid, 0, false, IGNORE_MISSING);
    if (!$cm || empty($cm->visible) || !empty($cm->deletioninprogress)) {
        return null;
    }
    $course = get_course($cm->course);
    if (!$course || empty($course->visible)) {
        return null;
    }
    $quiz = $DB->get_record('quiz', ['id' => $cm->instance], '*', IGNORE_MISSING);
    return $quiz ?: null;
}

/**
 * IDs de las preguntas fijas de un cuestionario.
 * Moodle 4.x/5.x: question_references + question_versions.
 * Moodle 3.x: quiz_slots.questionid.
 */
function lwpd_quiz_question_ids($quizid) {
    global $DB;
    $dbman = $DB->get_manager();
    $ids = [];

    if ($dbman->field_exists('quiz_slots', 'questionid')) {
        $sql = "SELECT DISTINCT questionid
                  FROM {quiz_slots}
                 WHERE quizid = ? AND questionid > 0";
        foreach ($DB->get_records_sql($sql, [$quizid]) as $row) {
            $ids[] = (int)$row->questionid;
        }
        return array_values(array_unique($ids));
    }

    if (!$dbman->table_exists('question_references')) {
        return [];
    }

    $sql = "SELECT qr.questionbankentryid, qr.version
              FROM {quiz_slots} qs
              JOIN {question_references} qr
                ON qr.itemid = qs.id
               AND qr.component = 'mod_quiz'
               AND qr.questionarea = 'slot'
             WHERE qs.quizid = ?";
    $refs = $DB->get_records_sql($sql, [$quizid]);

    foreach ($refs as $ref) {
        if ($ref->version) {
            $qid = $DB->get_field('question_versions', 'questionid', [
                'questionbankentryid' => $ref->questionbankentryid,
                'version' => $ref->version,
            ], IGNORE_MISSING);
        } else {
            $sqlv = "SELECT questionid
                       FROM {question_versions}
                      WHERE questionbankentryid = ?
                   ORDER BY version DESC";
            $qid = $DB->get_field_sql($sqlv, [$ref->questionbankentryid], IGNORE_MULTIPLE);
        }
        if ($qid) {
            $ids[] = (int)$qid;
        }
    }

    return array_values(array_unique($ids));
}

function lwpd_question_payload($question) {
    global $DB;

    if (!in_array($question->qtype, ['multichoice', 'truefalse'], true)) {
        return null;
    }

    $answers = $DB->get_records('question_answers', ['question' => $question->id], 'id ASC');
    if (count($answers) < 2) {
        return null;
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

    return [
        'id' => (int)$question->id,
        'q' => lwpd_plain($question->questiontext),
        'options' => $options,
        'correct' => $correct,
        'why' => lwpd_plain($question->generalfeedback),
    ];
}

/* -------------------------------------------------------------- seguridad */

if ($requirelogin) {
    require_login();
}

$quizCms = lwpd_ids($quizids);
$extraIds = lwpd_ids($extraids);

if (!$quizCms && !$extraIds) {
    lwpd_fail('endpoint-not-configured', 503);
}

if ($accesskey !== '') {
    $key = $_SERVER['HTTP_X_LWPD_KEY'] ?? optional_param('key', '', PARAM_TEXT);
    if (!hash_equals($accesskey, $key)) {
        lwpd_fail('forbidden', 403);
    }
}

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($allowedorigin !== '' && $origin !== '' && $origin !== $allowedorigin) {
    lwpd_fail('forbidden-origin', 403);
}

/* ------------------------------------------------------------ resolución */

$quizParamRaw = optional_param('quiz', '', PARAM_TEXT);
$requestedIds = lwpd_ids(optional_param('ids', '', PARAM_TEXT));

$allowedQuestionIds = [];
$quizQuestionMap = [];

foreach ($quizCms as $cmid) {
    $quiz = lwpd_visible_quiz($cmid);
    if (!$quiz) {
        continue;
    }
    $qids = lwpd_quiz_question_ids($quiz->id);
    $quizQuestionMap[$cmid] = $qids;
    $allowedQuestionIds = array_merge($allowedQuestionIds, $qids);
}
$allowedQuestionIds = array_values(array_unique(array_merge($allowedQuestionIds, $extraIds)));

if ($quizParamRaw === 'auto') {
    // Sin cmid en el juego: se usa el único cuestionario permitido y visible.
    $visibleQuizzes = array_keys($quizQuestionMap);
    if (count($visibleQuizzes) !== 1) {
        lwpd_fail('choose-quiz', 403);
    }
    $quizParam = (int)$visibleQuizzes[0];
} else {
    $quizParam = (int)$quizParamRaw;
}

if ($quizParam) {
    if (!in_array($quizParam, $quizCms, true)) {
        lwpd_fail('quiz-not-allowed', 403);
    }
    if (!isset($quizQuestionMap[$quizParam])) {
        lwpd_fail('quiz-not-visible', 403);
    }
    $requestedIds = $quizQuestionMap[$quizParam];
} else {
    if (!$requestedIds) {
        lwpd_fail('missing-ids');
    }
    $requestedIds = array_values(array_intersect($requestedIds, $allowedQuestionIds));
    if (!$requestedIds) {
        lwpd_fail('id-not-allowed', 403);
    }
}

$questions = [];
foreach ($requestedIds as $qid) {
    $question = $DB->get_record('question', ['id' => $qid], '*', IGNORE_MISSING);
    if (!$question) {
        continue;
    }
    $payload = lwpd_question_payload($question);
    if ($payload) {
        $questions[] = $payload;
    }
}

echo json_encode(['questions' => $questions], JSON_UNESCAPED_UNICODE);
