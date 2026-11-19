<?php
// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

defined('MOODLE_INTERNAL') || die();

if ($hassiteconfig) {
    $settings = new admin_settingpage(
        'local_lwpd',
        get_string('pluginname', 'local_lwpd')
    );

    $settings->add(new admin_setting_heading(
        'local_lwpd/heading',
        get_string('settingsheading', 'local_lwpd'),
        get_string('settingsheading_desc', 'local_lwpd')
    ));

    $settings->add(new admin_setting_configtext(
        'local_lwpd/quizids',
        get_string('quizids', 'local_lwpd'),
        get_string('quizids_desc', 'local_lwpd'),
        '',
        PARAM_TEXT
    ));

    $settings->add(new admin_setting_configtext(
        'local_lwpd/allowedids',
        get_string('allowedids', 'local_lwpd'),
        get_string('allowedids_desc', 'local_lwpd'),
        '',
        PARAM_TEXT
    ));

    $settings->add(new admin_setting_configtext(
        'local_lwpd/key',
        get_string('accesskey', 'local_lwpd'),
        get_string('accesskey_desc', 'local_lwpd'),
        '',
        PARAM_TEXT
    ));

    $settings->add(new admin_setting_configtext(
        'local_lwpd/allowedorigin',
        get_string('allowedorigin', 'local_lwpd'),
        get_string('allowedorigin_desc', 'local_lwpd'),
        '',
        PARAM_URL
    ));

    $settings->add(new admin_setting_configcheckbox(
        'local_lwpd/requirelogin',
        get_string('requirelogin', 'local_lwpd'),
        get_string('requirelogin_desc', 'local_lwpd'),
        0
    ));

    $ADMIN->add('localplugins', $settings);
}
