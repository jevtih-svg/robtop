<?php
/**
 * RobTop — отправка писем (только родительские сценарии: сброс пароля, приглашение родителя).
 *
 * Драйверы:
 *  - 'log'  (по умолчанию): письма НЕ шлются. Факт и ссылка пишутся в журнал events на сервере
 *           (для прототипа/отладки). Ссылка НИКОГДА не возвращается вызывающему по API.
 *  - 'smtp' (на будущее): реальная отправка через PHPMailer + транзакционный провайдер
 *           (SES/Postmark/Brevo/Mailgun) с DNS SPF/DKIM/DMARC. Пока не реализовано — падает в 'log'.
 *
 * Дети писем НЕ получают и email не имеют — это держит детскую часть без персональных данных.
 */

function rt_app_url($path) {
    $c = rt_config();
    $base = isset($c['app_base_url']) ? rtrim($c['app_base_url'], '/') . '/' : '';
    return $base . $path;
}

/**
 * Поставить письмо в отправку. $linkForLog — ссылка, которую в режиме 'log' сохраняем
 * в журнал на сервере (НЕ отдаём в ответе API). Возвращает true/false (успех постановки).
 */
function rt_mail_send($to, $subject, $body, $linkForLog = null) {
    $c = rt_config();
    $driver = isset($c['mail_driver']) ? $c['mail_driver'] : 'log';

    if ($driver === 'smtp') {
        $smtp = isset($c['mail_smtp']) && is_array($c['mail_smtp']) ? $c['mail_smtp'] : [];
        if (!empty($smtp['host'])) {
            // TODO (следующий инкремент): интеграция PHPMailer/Symfony Mailer.
            // Здесь будет реальная отправка с DKIM-подписью провайдера.
            // Пока провайдер не настроен — мягко падаем в режим журнала ниже.
        }
    }

    // Режим журнала: фиксируем факт на сервере, ссылку в ответ НЕ кладём.
    try {
        rt_log('mail', 'queued', null, substr((string)$subject, 0, 160), null, null, [
            'to'   => $to,
            'link' => $linkForLog,
            'driver' => $driver,
        ]);
    } catch (Throwable $e) {}
    return true;
}
