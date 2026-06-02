"use strict";

/**
 * Middleware для Express
 * Логирование, rate limiting, обработка ошибок
 */

const { MESSAGES } = require('./config');
const { getClientIp } = require('./utils');

/**
 * Создаёт middleware для логирования запросов
 * Добавляет req.clientIp
 */
function createRequestLogger() {
    return (req, res, next) => {
        const ip = getClientIp(req);
        console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - IP: ${ip}`);
        req.clientIp = ip;
        next();
    };
}

/**
 * Создаёт middleware для rate limiting
 * @param {object} rateLimiter - экземпляр rate limiter'а
 */
function createRateLimitMiddleware(rateLimiter) {
    return (req, res, next) => {
        const clientIp = req.clientIp;
        if (!rateLimiter.check(clientIp)) {
            console.log(`Rate limit exceeded for IP: ${clientIp}`);
            return res.status(429).json({ error: MESSAGES.RATE_LIMIT });
        }
        next();
    };
}

/**
 * Middleware для обработки ошибок
 */
function errorHandler(err, req, res, next) {
    console.error('Необработанная ошибка:', err.stack);
    res.status(500).send('Что-то пошло не так!');
}

module.exports = { createRequestLogger, createRateLimitMiddleware, errorHandler };