<?php
// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

defined('MOODLE_INTERNAL') || die();

$string['pluginname'] = 'Escuadrón Web questions';
$string['settingsheading'] = 'Access and question sources';
$string['settingsheading_desc'] = 'Configure which quizzes the VR game may read and how the endpoint is protected.';
$string['quizids'] = 'Allowed quiz cmids';
$string['quizids_desc'] = 'Comma-separated course module IDs, for example 1234,5678. Only questions from these visible quizzes are served.';
$string['allowedids'] = 'Extra question IDs (optional)';
$string['allowedids_desc'] = 'Comma-separated question IDs allowed in addition to the quizzes.';
$string['accesskey'] = 'Access key (optional)';
$string['accesskey_desc'] = 'If set, the game must send it in the X-LWPD-Key header.';
$string['allowedorigin'] = 'Allowed origin (optional)';
$string['allowedorigin_desc'] = 'For example https://jrubioastigarraga.github.io. Leave empty to allow any origin.';
$string['requirelogin'] = 'Require Moodle login';
$string['requirelogin_desc'] = 'If enabled, the endpoint only responds to users with an active Moodle session. Cross-origin cookies may not be sent by the browser.';
