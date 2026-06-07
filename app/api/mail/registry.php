<?php
/**
 * РЕЕСТР ПИСЕМ RobTop — единый файл-референс: какое действие → какое письмо.
 *
 * Для каждого действия:
 *   desc         — когда отправляется (по-русски, для людей);
 *   file         — имя файлов шаблона в этой папке: <file>.<en|ru|lv>.html;
 *   placeholders — какие {{плейсхолдеры}} подставляются в шаблон и тему;
 *   subject      — тема письма на 3 языках.
 *
 * Правила:
 *   - Письма получают ТОЛЬКО родители. У детей почты нет.
 *   - Язык письма = язык приложения пользователя (клиент шлёт lang в запросе);
 *     фолбэк: mail_default_lang из config.php → en.
 *   - Отправка из кода: rt_mail_send_tpl($to, '<действие>', $lang, [плейсхолдеры]) — api/_mail.php.
 *   - Новое письмо = новая запись здесь + 3 файла <file>.en/ru/lv.html рядом.
 *   - Тест (сессией мастер-админа в том же браузере): <сайт>/api/mail_test.php?to=<адрес>&lang=ru
 */
return [

    'password_reset' => [
        'desc'         => 'Сброс пароля родителя: ссылка, по которой задаётся новый пароль (живёт 1 час).',
        'file'         => 'password_reset',
        'placeholders' => ['{{link}}'],
        'subject'      => [
            'en' => 'RobTop: password reset',
            'ru' => 'RobTop: сброс пароля',
            'lv' => 'RobTop: paroles atjaunošana',
        ],
    ],

    'invite_co_parent' => [
        'desc'         => 'Приглашение второго родителя в семью (ссылка живёт 7 дней).',
        'file'         => 'invite_co_parent',
        'placeholders' => ['{{inviter}}', '{{link}}'],
        'subject'      => [
            'en' => 'RobTop: family invitation',
            'ru' => 'RobTop: приглашение в семью',
            'lv' => 'RobTop: ielūgums ģimenei',
        ],
    ],

    'transfer_child' => [
        'desc'         => 'Передача родительских прав на ребёнка его настоящему родителю (ссылка живёт 7 дней).',
        'file'         => 'transfer_child',
        'placeholders' => ['{{inviter}}', '{{child}}', '{{link}}'],
        'subject'      => [
            'en' => 'RobTop: access to your child',
            'ru' => 'RobTop: доступ к вашему ребёнку',
            'lv' => 'RobTop: piekļuve jūsu bērnam',
        ],
    ],

    'parent_attached' => [
        'desc'         => 'Админ привязал СУЩЕСТВУЮЩЕГО родителя к семье: уведомление (вход обычным паролем, без 1234).',
        'file'         => 'parent_attached',
        'placeholders' => ['{{nickname}}', '{{family}}', '{{link}}'],
        'subject'      => [
            'en' => 'RobTop: you were added to a family',
            'ru' => 'RobTop: вас добавили в семью',
            'lv' => 'RobTop: jūs pievienoja ģimenei',
        ],
    ],

    'admin_invite_parent' => [
        'desc'         => 'Админ создал родительский аккаунт: приглашение в приложение (что это, зачем присоединяться, вход по email + одноразовый 1234).',
        'file'         => 'admin_invite_parent',
        'placeholders' => ['{{nickname}}', '{{link}}'],
        'subject'      => [
            'en' => 'You are invited to RobTop',
            'ru' => 'Вас пригласили в RobTop',
            'lv' => 'Jūs esat uzaicināts uz RobTop',
        ],
    ],

    'test' => [
        'desc'         => 'Тестовое письмо для проверки настройки почты (mail_test.php).',
        'file'         => 'test',
        'placeholders' => ['{{driver}}'],
        'subject'      => [
            'en' => 'RobTop: test email',
            'ru' => 'RobTop: тестовое письмо',
            'lv' => 'RobTop: testa vēstule',
        ],
    ],

];
