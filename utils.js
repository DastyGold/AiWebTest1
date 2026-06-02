"use strict";

/**
 * Утилиты общего назначения
 */

/**
 * Получение IP клиента (учитывает прокси)
 * @param {import('express').Request} req
 * @returns {string}
 */
function getClientIp(req) {
    return req.headers['x-forwarded-for']?.split(',')[0].trim() ||
           req.connection.remoteAddress ||
           req.socket.remoteAddress ||
           (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
           'unknown';
}

/**
 * Кодирование учетных данных в Base64
 * @param {string} clientId
 * @param {string} clientSecret
 * @returns {string}
 */
function encodeCredentials(clientId, clientSecret) {
    const credentials = `${clientId}:${clientSecret}`;
    return Buffer.from(credentials).toString('base64');
}

module.exports = { getClientIp, encodeCredentials };