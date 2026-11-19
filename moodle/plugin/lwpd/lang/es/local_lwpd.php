<?php
// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

defined('MOODLE_INTERNAL') || die();

$string['pluginname'] = 'Escuadrón Web (preguntas)';
$string['settingsheading'] = 'Acceso y fuentes de preguntas';
$string['settingsheading_desc'] = 'Configura de qué cuestionarios puede leer el juego y cómo se protege el endpoint.';
$string['quizids'] = 'cmid de cuestionarios permitidos';
$string['quizids_desc'] = 'IDs de módulo separados por comas, por ejemplo 1234,5678. Solo se sirven preguntas de esos cuestionarios visibles.';
$string['allowedids'] = 'IDs de pregunta adicionales (opcional)';
$string['allowedids_desc'] = 'IDs de pregunta permitidos, además de los cuestionarios.';
$string['accesskey'] = 'Clave de acceso (opcional)';
$string['accesskey_desc'] = 'Si se define, el juego debe enviarla en la cabecera X-LWPD-Key.';
$string['allowedorigin'] = 'Origen permitido (opcional)';
$string['allowedorigin_desc'] = 'Por ejemplo https://jrubioastigarraga.github.io. Déjalo vacío para aceptar cualquier origen.';
$string['requirelogin'] = 'Exigir sesión de Moodle';
$string['requirelogin_desc'] = 'Si se activa, el endpoint solo responde a usuarios con sesión iniciada. El navegador puede no enviar cookies entre dominios.';
