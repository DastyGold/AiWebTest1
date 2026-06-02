"use strict";

/**
 * Централизованная конфигурация приложения
 * Все константы, лимиты и сообщения в одном месте
 */

// ============================================================
// Сервер
// ============================================================
const PORT = process.env.PORT || 5000;

// ============================================================
// GigaChat API
// ============================================================
const GIGACHAT = {
    // URL эндпоинтов
    AUTH_URL: 'https://ngw.devices.sberbank.ru:9443/api/v2/oauth',
    API_URL: 'https://gigachat.devices.sberbank.ru/api/v1/chat/completions',

    // Учетные данные
    CLIENT_ID: process.env.GIGACHAT_CLIENT_ID,
    CLIENT_SECRET: process.env.GIGACHAT_CLIENT_SECRET,

    // Параметры запроса
    SCOPE: 'GIGACHAT_API_PERS',
    MODEL: 'GigaChat',
    TEMPERATURE: 0.7,
    MAX_TOKENS: 1000,

    // Таймауты (в миллисекундах)
    TOKEN_TIMEOUT: 10000,       // 10 сек на получение токена
    REQUEST_TIMEOUT: 30000,     // 30 сек на запрос к GigaChat
    STREAM_TIMEOUT: 60000       // 60 сек на streaming
};

// ============================================================
// Rate Limiting
// ============================================================
const RATE_LIMIT = {
    WINDOW_MS: 60 * 1000,       // 1 минута
    MAX_REQUESTS: 30,           // 30 запросов в минуту
    CLEANUP_INTERVAL_MS: 5 * 60 * 1000  // очистка каждые 5 минут
};

// ============================================================
// Лимиты валидации
// ============================================================
const VALIDATION = {
    QUESTION: {
        MIN_LENGTH: 1,
        MAX_LENGTH: 2000
    },
    FEEDBACK: {
        NAME_MIN: 2,
        NAME_MAX: 100,
        SUBJECT_MIN: 3,
        SUBJECT_MAX: 200,
        MESSAGE_MIN: 10,
        MESSAGE_MAX: 5000
    }
};

// ============================================================
// CORS
// ============================================================
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['http://localhost:5000', 'http://localhost:3000', 'https://sergeogold.com'];

const CORS_OPTIONS = {
    origin: ALLOWED_ORIGINS,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    optionsSuccessStatus: 200
};

// ============================================================
// Сообщения для пользователя
// ============================================================
const MESSAGES = {
    // Ошибки rate limit
    RATE_LIMIT: 'Превышен лимит запросов. Пожалуйста, попробуйте через минуту.',

    // Ошибки валидации question
    QUESTION_REQUIRED: 'Необходимо указать вопрос',
    QUESTION_TYPE: 'Вопрос должен быть строкой',
    QUESTION_EMPTY: 'Вопрос не может быть пустым',
    QUESTION_TOO_LONG: `Вопрос слишком длинный. Максимум ${VALIDATION.QUESTION.MAX_LENGTH} символов.`,

    // Ошибки валидации feedback
    FEEDBACK_REQUIRED: 'Все поля обязательны для заполнения',
    NAME_INVALID: `Имя должно содержать от ${VALIDATION.FEEDBACK.NAME_MIN} до ${VALIDATION.FEEDBACK.NAME_MAX} символов`,
    EMAIL_INVALID: 'Некорректный формат email',
    SUBJECT_INVALID: `Тема должна содержать от ${VALIDATION.FEEDBACK.SUBJECT_MIN} до ${VALIDATION.FEEDBACK.SUBJECT_MAX} символов`,
    MESSAGE_INVALID: `Сообщение должно содержать от ${VALIDATION.FEEDBACK.MESSAGE_MIN} до ${VALIDATION.FEEDBACK.MESSAGE_MAX} символов`,

    // Общие ошибки
    INTERNAL_ERROR: 'Произошла ошибка при обработке запроса',
    FEEDBACK_SAVE_ERROR: 'Произошла ошибка при сохранении сообщения',
    FEEDBACK_GET_ERROR: 'Произошла ошибка при получении сообщений',
    FEEDBACK_SUCCESS: 'Ваше сообщение успешно отправлено и сохранено!',

    // Ошибки GigaChat
    GIGACHAT_AUTH_ERROR: 'Не удалось получить токен доступа',
    GIGACHAT_RESPONSE_ERROR: 'Некорректный формат ответа от GigaChat API',
    GIGACHAT_TIMEOUT: 'Превышено время ожидания ответа от GigaChat',

    // Ошибки конфигурации
    MISSING_CREDENTIALS: 'ОШИБКА: Необходимо установить GIGACHAT_CLIENT_ID и GIGACHAT_CLIENT_SECRET в переменных окружения',

    // API
    API_NOT_FOUND: 'API endpoint not found'
};

// ============================================================
// Экспорт
// ============================================================
module.exports = {
    PORT,
    GIGACHAT,
    RATE_LIMIT,
    VALIDATION,
    CORS_OPTIONS,
    MESSAGES
};