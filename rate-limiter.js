"use strict";

/**
 * Модуль для ограничения частоты запросов (Rate Limiting)
 * Хранит состояние в памяти. При перезапуске сервера счётчики сбрасываются.
 * Для production рекомендуется использовать Redis или аналоги.
 */

const rateLimitStore = new Map();

const DEFAULT_CONFIG = {
    windowMs: 60 * 1000,       // 1 минута
    maxRequests: 30,            // максимум запросов в окне
    cleanupIntervalMs: 5 * 60 * 1000  // очистка устаревших записей каждые 5 минут
};

/**
 * Создаёт экземпляр rate limiter'а
 * @param {Object} config - Конфигурация
 * @param {number} config.windowMs - Временное окно в миллисекундах
 * @param {number} config.maxRequests - Максимальное количество запросов в окне
 * @param {number} config.cleanupIntervalMs - Интервал очистки устаревших записей
 */
function createRateLimiter(config = {}) {
    const cfg = { ...DEFAULT_CONFIG, ...config };
    const store = new Map();
    let cleanupTimer = null;

    /**
     * Проверяет, не превысил ли клиент лимит запросов
     * @param {string} clientIp - IP-адрес клиента
     * @returns {boolean} - true, если запрос разрешён; false, если лимит превышен
     */
    function check(clientIp) {
        const now = Date.now();
        const record = store.get(clientIp) || { count: 0, resetTime: now + cfg.windowMs };

        // Если окно истекло — сбрасываем
        if (now > record.resetTime) {
            record.count = 0;
            record.resetTime = now + cfg.windowMs;
        }

        if (record.count >= cfg.maxRequests) {
            return false; // лимит превышен
        }

        record.count++;
        store.set(clientIp, record);
        return true;
    }

    /**
     * Возвращает оставшееся количество запросов для клиента
     * @param {string} clientIp - IP-адрес клиента
     * @returns {{ remaining: number, resetTime: number }}
     */
    function getRemaining(clientIp) {
        const now = Date.now();
        const record = store.get(clientIp);

        if (!record || now > record.resetTime) {
            return { remaining: cfg.maxRequests, resetTime: now + cfg.windowMs };
        }

        return {
            remaining: Math.max(0, cfg.maxRequests - record.count),
            resetTime: record.resetTime
        };
    }

    /**
     * Сбрасывает счётчик для указанного IP
     * @param {string} clientIp - IP-адрес клиента
     */
    function reset(clientIp) {
        store.delete(clientIp);
    }

    /**
     * Очищает устаревшие записи (с истекшим окном)
     */
    function cleanup() {
        const now = Date.now();
        for (const [ip, record] of store.entries()) {
            if (now > record.resetTime) {
                store.delete(ip);
            }
        }
    }

    /**
     * Запускает периодическую очистку устаревших записей
     */
    function startCleanup() {
        if (cleanupTimer) return;
        cleanupTimer = setInterval(cleanup, cfg.cleanupIntervalMs);
        // Не даём таймеру блокировать завершение процесса
        if (cleanupTimer.unref) {
            cleanupTimer.unref();
        }
    }

    /**
     * Останавливает периодическую очистку
     */
    function stopCleanup() {
        if (cleanupTimer) {
            clearInterval(cleanupTimer);
            cleanupTimer = null;
        }
    }

    // Запускаем очистку по умолчанию
    startCleanup();

    return {
        check,
        getRemaining,
        reset,
        cleanup,
        startCleanup,
        stopCleanup,
        get config() { return { ...cfg }; }
    };
}

module.exports = { createRateLimiter };