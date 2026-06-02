"use strict";

/**
 * Backend server for the personal website
 * Тонкий слой: только маршруты, вся логика вынесена в модули
 */

// ============================================================
// Загрузка переменных окружения (ДО импорта config.js)
// ============================================================
const dotenv = require('dotenv');
dotenv.config();

// ============================================================
// Импорт зависимостей
// ============================================================
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const fs = require('fs');

// ============================================================
// Импорт модулей приложения
// ============================================================
const { PORT, CORS_OPTIONS, RATE_LIMIT, GIGACHAT, MESSAGES } = require('./config');
const { saveFeedback, getAllFeedback } = require('./database');
const { createRateLimiter } = require('./rate-limiter');
const { askGigaChat, askGigaChatStream } = require('./gigachat');
const { validateQuestion, validateFeedback } = require('./validators');
const { createRequestLogger, createRateLimitMiddleware, errorHandler } = require('./middleware');

// ============================================================
// Проверка конфигурации
// ============================================================
if (!GIGACHAT.CLIENT_ID || !GIGACHAT.CLIENT_SECRET) {
    console.error(MESSAGES.MISSING_CREDENTIALS);
    process.exit(1);
}

// ============================================================
// Создание Express приложения
// ============================================================
const app = express();

// ============================================================
// Middleware
// ============================================================
app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: false
}));
app.use(cors(CORS_OPTIONS));
app.use(express.json({ limit: '10kb' }));
app.use(createRequestLogger());

// Rate limiter для API
const apiRateLimiter = createRateLimiter({
    windowMs: RATE_LIMIT.WINDOW_MS,
    maxRequests: RATE_LIMIT.MAX_REQUESTS
});
const apiRateLimit = createRateLimitMiddleware(apiRateLimiter);

// ============================================================
// API маршруты
// ============================================================

/**
 * POST /api/ask — запрос к нейросети GigaChat
 * Поддерживает streaming (если query-параметр stream=true)
 */
app.post('/api/ask', apiRateLimit, async (req, res) => {
    const clientIp = req.clientIp;

    try {
        // Валидация вопроса
        const validation = validateQuestion(req.body.question);
        if (!validation.valid) {
            return res.status(400).json({ error: validation.error });
        }

        const question = req.body.question.trim();
        const useStream = req.query.stream === 'true';

        if (useStream) {
            // ============================================
            // Streaming-режим
            // ============================================
            console.log(`[Streaming] Запрос к GigaChat от IP: ${clientIp}`);

            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');
            res.setHeader('X-Accel-Buffering', 'no');

            let fullAnswer = '';

            await askGigaChatStream(question, {
                onChunk: (chunk) => {
                    fullAnswer += chunk;
                    // Отправляем SSE-событие с чанком
                    res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
                },
                onComplete: () => {
                    console.log(`[Streaming] Успешный ответ от GigaChat от IP: ${clientIp}`);
                    res.write(`data: ${JSON.stringify({ done: true, fullAnswer })}\n\n`);
                    res.end();
                },
                onError: (error) => {
                    console.error(`[Streaming] Ошибка от IP: ${clientIp}:`, error);
                    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
                    res.end();
                },
                signal: req.socket._destroyed ? AbortSignal.abort() : undefined
            });

            // Обработка отключения клиента
            req.on('close', () => {
                console.log(`[Streaming] Клиент отключился: ${clientIp}`);
            });

        } else {
            // ============================================
            // Обычный режим (без streaming)
            // ============================================
            const answer = await askGigaChat(question);
            console.log(`Успешный запрос к GigaChat от IP: ${clientIp}`);
            res.json({ answer });
        }

    } catch (error) {
        console.error('Ошибка при обработке запроса к нейросети:', error);
        res.status(500).json({ error: error.message || MESSAGES.INTERNAL_ERROR });
    }
});

/**
 * POST /api/feedback — сохранение сообщения обратной связи
 */
app.post('/api/feedback', apiRateLimit, async (req, res) => {
    const clientIp = req.clientIp;

    try {
        // Валидация данных
        const validation = validateFeedback(req.body);
        if (!validation.valid) {
            return res.status(400).json({ error: validation.error });
        }

        const { name, email, subject, message } = req.body;

        // Сохраняем в базу данных
        saveFeedback(
            name.trim(),
            email.trim(),
            subject.trim(),
            message.trim(),
            (err, id) => {
                if (err) {
                    console.error('Ошибка при сохранении сообщения в базу данных:', err);
                    return res.status(500).json({ error: MESSAGES.FEEDBACK_SAVE_ERROR });
                }

                console.log(`Сообщение обратной связи сохранено с ID ${id} от IP: ${clientIp}`);
                res.json({ success: true, message: MESSAGES.FEEDBACK_SUCCESS, id });
            }
        );

    } catch (error) {
        console.error('Ошибка при обработке формы обратной связи:', error);
        res.status(500).json({ error: MESSAGES.FEEDBACK_SAVE_ERROR });
    }
});

/**
 * GET /api/feedback — получение всех сообщений обратной связи
 * Защищено базовой аутентификацией
 */
app.get('/api/feedback', (req, res) => {
    // Базовая аутентификация
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Basic ')) {
        res.setHeader('WWW-Authenticate', 'Basic realm="Admin Area"');
        return res.status(401).json({ error: 'Требуется аутентификация' });
    }

    const base64Credentials = authHeader.split(' ')[1];
    const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
    const [username, password] = credentials.split(':');

    const adminUser = process.env.ADMIN_USERNAME || 'admin';
    const adminPass = process.env.ADMIN_PASSWORD || 'admin123';

    if (username !== adminUser || password !== adminPass) {
        return res.status(403).json({ error: 'Неверные учетные данные' });
    }

    getAllFeedback((err, feedbacks) => {
        if (err) {
            console.error('Ошибка при получении сообщений обратной связи:', err);
            return res.status(500).json({ error: MESSAGES.FEEDBACK_GET_ERROR });
        }
        res.json(feedbacks);
    });
});

// ============================================================
// Статические файлы
// ============================================================
app.use(express.static(__dirname));

// ============================================================
// SPA-роутинг
// ============================================================
app.get('*', (req, res) => {
    // Пропускаем API-запросы
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({ error: MESSAGES.API_NOT_FOUND });
    }

    // Проверяем, не является ли запрос статическим файлом
    const filePath = path.join(__dirname, req.path);
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        return res.sendFile(filePath);
    }

    // Иначе отдаём index.html для SPA
    res.sendFile(path.join(__dirname, 'index.html'));
});

// ============================================================
// Обработка ошибок
// ============================================================
app.use(errorHandler);

// ============================================================
// Запуск сервера
// ============================================================
app.listen(PORT, () => {
    console.log(`\n=== Сервер бэкенда запущен ===`);
    console.log(`Порт: ${PORT}`);
    console.log(`Конфигурация CORS: ${CORS_OPTIONS.origin.join(', ')}`);
    console.log(`Ограничение запросов: ${RATE_LIMIT.MAX_REQUESTS} запросов в минуту`);
    console.log(`\nДоступные API эндпоинты:`);
    console.log(`- POST /api/ask - для запросов к нейросети`);
    console.log(`- POST /api/ask?stream=true - для streaming-запросов к нейросети`);
    console.log(`- POST /api/feedback - для формы обратной связи`);
    console.log(`- GET /api/feedback - для получения всех сообщений обратной связи`);
    console.log(`\nДля корректной работы убедитесь, что:`);
    console.log(`1. В файле .env указаны GIGACHAT_CLIENT_ID и GIGACHAT_CLIENT_SECRET`);
    console.log(`2. База данных feedback.db существует`);
    console.log(`3. Сервер запущен из директории проекта`);
});

module.exports = app;