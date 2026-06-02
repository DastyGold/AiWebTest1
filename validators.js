"use strict";

/**
 * Функции валидации входных данных
 */

const { VALIDATION, MESSAGES } = require('./config');

/**
 * Валидация вопроса для GigaChat
 * @param {*} question - значение из req.body.question
 * @returns {{ valid: boolean, error?: string }}
 */
function validateQuestion(question) {
    if (question === undefined || question === null) {
        return { valid: false, error: MESSAGES.QUESTION_REQUIRED };
    }

    if (typeof question !== 'string') {
        return { valid: false, error: MESSAGES.QUESTION_TYPE };
    }

    if (question.trim().length < VALIDATION.QUESTION.MIN_LENGTH) {
        return { valid: false, error: MESSAGES.QUESTION_EMPTY };
    }

    if (question.length > VALIDATION.QUESTION.MAX_LENGTH) {
        return { valid: false, error: MESSAGES.QUESTION_TOO_LONG };
    }

    return { valid: true };
}

/**
 * Валидация полей формы обратной связи
 * @param {{ name: *, email: *, subject: *, message: * }} body
 * @returns {{ valid: boolean, error?: string }}
 */
function validateFeedback(body) {
    const { name, email, subject, message } = body;

    // Проверка наличия всех полей
    if (!name || !email || !subject || !message) {
        return { valid: false, error: MESSAGES.FEEDBACK_REQUIRED };
    }

    // Валидация имени
    if (typeof name !== 'string' ||
        name.trim().length < VALIDATION.FEEDBACK.NAME_MIN ||
        name.trim().length > VALIDATION.FEEDBACK.NAME_MAX) {
        return { valid: false, error: MESSAGES.NAME_INVALID };
    }

    // Валидация email
    if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return { valid: false, error: MESSAGES.EMAIL_INVALID };
    }

    // Валидация темы
    if (typeof subject !== 'string' ||
        subject.trim().length < VALIDATION.FEEDBACK.SUBJECT_MIN ||
        subject.trim().length > VALIDATION.FEEDBACK.SUBJECT_MAX) {
        return { valid: false, error: MESSAGES.SUBJECT_INVALID };
    }

    // Валидация сообщения
    if (typeof message !== 'string' ||
        message.trim().length < VALIDATION.FEEDBACK.MESSAGE_MIN ||
        message.trim().length > VALIDATION.FEEDBACK.MESSAGE_MAX) {
        return { valid: false, error: MESSAGES.MESSAGE_INVALID };
    }

    return { valid: true };
}

module.exports = { validateQuestion, validateFeedback };