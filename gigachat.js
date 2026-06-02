"use strict";

/**
 * Модуль для работы с GigaChat API
 * Управление токенами, отправка запросов (в т.ч. streaming)
 *
 * Использует https.request вместо fetch для совместимости
 * с самоподписанными сертификатами Sberbank
 */

const https = require('https');
const crypto = require('crypto');
const { GIGACHAT, MESSAGES } = require('./config');
const { encodeCredentials } = require('./utils');

// ============================================================
// HTTPS-агент с отключенной проверкой сертификатов
// ТОЛЬКО для GigaChat API (Sberbank использует самоподписанные сертификаты)
// ============================================================
const gigachatAgent = new https.Agent({
    rejectUnauthorized: false,
    keepAlive: true
});

// ============================================================
// Управление токеном доступа
// ============================================================
let accessToken = null;
let tokenExpiry = null;

/**
 * Выполняет HTTPS-запрос и возвращает тело ответа
 * @param {string} url - полный URL
 * @param {object} options - опции запроса (method, headers, body, timeout)
 * @returns {Promise<{ status: number, body: string }>}
 */
function httpsRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const requestOptions = {
            hostname: urlObj.hostname,
            port: urlObj.port,
            path: urlObj.pathname + urlObj.search,
            method: options.method || 'GET',
            headers: options.headers || {},
            agent: gigachatAgent,
            timeout: options.timeout || GIGACHAT.REQUEST_TIMEOUT
        };

        const req = https.request(requestOptions, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                resolve({ status: res.statusCode, body: data });
            });
        });

        req.on('error', (err) => reject(err));
        req.on('timeout', () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });

        if (options.body) {
            req.write(options.body);
        }
        req.end();
    });
}

/**
 * Получение токена доступа к GigaChat API
 * Кеширует токен до истечения срока действия
 * @returns {Promise<string>}
 */
async function getAccessToken() {
    // Проверяем, есть ли действующий токен
    if (accessToken && tokenExpiry && Date.now() < tokenExpiry) {
        return accessToken;
    }

    const rqUid = crypto.randomUUID();
    console.log(`[GigaChat] Запрос токена с RqUID: ${rqUid}`);

    try {
        const response = await httpsRequest(GIGACHAT.AUTH_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${encodeCredentials(GIGACHAT.CLIENT_ID, GIGACHAT.CLIENT_SECRET)}`,
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json',
                'RqUID': rqUid
            },
            body: `scope=${GIGACHAT.SCOPE}`,
            timeout: GIGACHAT.TOKEN_TIMEOUT
        });

        if (response.status < 200 || response.status >= 300) {
            console.error(`[GigaChat] Ошибка HTTP при получении токена: ${response.status} - ${response.body}`);
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = JSON.parse(response.body);

        if (!data.access_token) {
            throw new Error(MESSAGES.GIGACHAT_AUTH_ERROR);
        }

        accessToken = data.access_token;
        tokenExpiry = data.expires_at;

        console.log('[GigaChat] Новый токен доступа успешно получен и сохранен');
        return accessToken;

    } catch (error) {
        if (error.message === 'Request timeout') {
            console.error('[GigaChat] Таймаут при получении токена');
            throw new Error(MESSAGES.GIGACHAT_TIMEOUT);
        }
        console.error('[GigaChat] Ошибка при получении токена доступа:', error);
        throw error;
    }
}

/**
 * Отправка запроса к GigaChat API (без streaming)
 * @param {string} question - текст вопроса
 * @returns {Promise<string>} - ответ от GigaChat
 */
async function askGigaChat(question) {
    const token = await getAccessToken();

    try {
        const response = await httpsRequest(GIGACHAT.API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: GIGACHAT.MODEL,
                messages: [{ role: "user", content: question.trim() }],
                temperature: GIGACHAT.TEMPERATURE,
                max_tokens: GIGACHAT.MAX_TOKENS,
                stream: false
            }),
            timeout: GIGACHAT.REQUEST_TIMEOUT
        });

        if (response.status < 200 || response.status >= 300) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = JSON.parse(response.body);

        if (!data.choices || !data.choices[0] || !data.choices[0].message) {
            throw new Error(MESSAGES.GIGACHAT_RESPONSE_ERROR);
        }

        return data.choices[0].message.content;

    } catch (error) {
        if (error.message === 'Request timeout') {
            throw new Error(MESSAGES.GIGACHAT_TIMEOUT);
        }
        throw error;
    }
}

/**
 * Отправка streaming-запроса к GigaChat API
 * @param {string} question - текст вопроса
 * @param {object} callbacks - колбэки для обработки чанков
 * @param {function(string)} callbacks.onChunk - вызывается при получении каждого чанка
 * @param {function(string)} callbacks.onComplete - вызывается при завершении
 * @param {function(Error)} callbacks.onError - вызывается при ошибке
 * @param {AbortSignal} [callbacks.signal] - сигнал для отмены запроса
 */
async function askGigaChatStream(question, callbacks) {
    const { onChunk, onComplete, onError, signal } = callbacks;
    const token = await getAccessToken();

    const urlObj = new URL(GIGACHAT.API_URL);
    const requestOptions = {
        hostname: urlObj.hostname,
        port: urlObj.port,
        path: urlObj.pathname + urlObj.search,
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'text/event-stream'
        },
        agent: gigachatAgent,
        timeout: GIGACHAT.STREAM_TIMEOUT
    };

    const body = JSON.stringify({
        model: GIGACHAT.MODEL,
        messages: [{ role: "user", content: question.trim() }],
        temperature: GIGACHAT.TEMPERATURE,
        max_tokens: GIGACHAT.MAX_TOKENS,
        stream: true
    });

    const req = https.request(requestOptions, (res) => {
        let buffer = '';

        res.on('data', (chunk) => {
            buffer += chunk.toString();

            // Разбираем SSE-события
            const lines = buffer.split('\n');
            buffer = lines.pop() || ''; // последняя строка может быть неполной

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const dataStr = line.slice(6).trim();

                    // Пропускаем сигнал завершения
                    if (dataStr === '[DONE]') continue;

                    try {
                        const data = JSON.parse(dataStr);
                        const content = data.choices?.[0]?.delta?.content || '';
                        if (content) {
                            onChunk(content);
                        }
                    } catch (parseError) {
                        console.warn('[GigaChat] Ошибка парсинга чанка:', parseError.message);
                    }
                }
            }
        });

        res.on('end', () => {
            onComplete();
        });

        res.on('error', (err) => {
            onError(err);
        });
    });

    req.on('timeout', () => {
        req.destroy();
        onError(new Error(MESSAGES.GIGACHAT_TIMEOUT));
    });

    req.on('error', (err) => {
        onError(err);
    });

    // Поддержка отмены запроса через AbortSignal
    if (signal) {
        signal.addEventListener('abort', () => {
            req.destroy();
        });
    }

    req.write(body);
    req.end();
}

module.exports = { getAccessToken, askGigaChat, askGigaChatStream };