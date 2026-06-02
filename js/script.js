/**
 * Модуль чата с GigaChat
 * Управляет интерфейсом чата и взаимодействием с API
 */

// Конфигурация чата
const CHAT_CONFIG = {
    API_ENDPOINT: '/api/ask',
    MAX_MESSAGE_LENGTH: 1000,
    MAX_HISTORY_MESSAGES: 50,
    ANIMATION_DELAY: 10,
    FOCUS_DELAY: 300
};

// Состояние чата
let chatState = {
    messages: [], // История сообщений
    isOpen: false, // Состояние открытия чата
    isProcessing: false // Состояние обработки запроса
};

// DOM элементы
const DOM = {
    modal: null,
    chatHistory: null,
    chatInput: null,
    sendButton: null,
    chatLoading: null
};

// Инициализация DOM элементов
function initializeDOM() {
    DOM.modal = document.getElementById('chatModal');
    DOM.chatHistory = document.getElementById('chatHistory');
    DOM.chatInput = document.getElementById('chatInput');
    DOM.sendButton = document.getElementById('sendButton');
    DOM.chatLoading = document.getElementById('chatLoading');
    
    // Устанавливаем начальные стили для анимации сообщений
    if (DOM.chatHistory) {
        DOM.chatHistory.style.scrollBehavior = 'smooth';
    }
}

// Функция открытия чата
function openChat() {
    if (chatState.isOpen) return;
    
    // Показываем модальное окно
    DOM.modal.style.display = 'block';
    
    // Запускаем анимацию появления
    setTimeout(() => {
        DOM.modal.classList.add('show');
    }, CHAT_CONFIG.ANIMATION_DELAY);
    
    // Устанавливаем фокус на поле ввода
    setTimeout(() => {
        if (DOM.chatInput) {
            DOM.chatInput.focus();
        }
    }, CHAT_CONFIG.FOCUS_DELAY);
    
    chatState.isOpen = true;
}

// Функция закрытия чата
function closeChat() {
    if (!chatState.isOpen) return;
    
    // Удаляем класс show для анимации исчезновения
    DOM.modal.classList.remove('show');
    
    // Скрываем модальное окно после завершения анимации
    setTimeout(() => {
        DOM.modal.style.display = 'none';
    }, 300);
    
    chatState.isOpen = false;
}

// Функция закрытия модального окна (для обратной совместимости)
function closeModal() {
    closeChat();
}

// Функция для добавления сообщения в чат
function addMessage(role, content) {
    // Создаем объект сообщения
    const message = {
        role: role,
        content: content,
        timestamp: new Date()
    };
    
    // Добавляем сообщение в историю
    chatState.messages.push(message);
    
    // Ограничиваем количество сообщений в истории
    if (chatState.messages.length > CHAT_CONFIG.MAX_HISTORY_MESSAGES) {
        chatState.messages = chatState.messages.slice(-CHAT_CONFIG.MAX_HISTORY_MESSAGES);
    }
    
    // Отображаем сообщение
    renderMessage(message);
    
    // Прокручиваем к последнему сообщению с небольшой задержкой для завершения анимаций
    setTimeout(() => {
        scrollToBottom();
    }, 50);
}

// Функция для отображения сообщения в чате
function renderMessage(message) {
    // Создаем элемент сообщения
    const messageElement = document.createElement('div');
    messageElement.className = `chat-message ${message.role}`;
    
    // Форматирование времени
    const timeString = message.timestamp.toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit'
    });
    
    // Определение аватара
    const avatarText = message.role === 'user' ? 'Я' : 'AI';
    
    // Формируем HTML сообщения
    messageElement.innerHTML = `
        <div class="message-avatar">${avatarText}</div>
        <div class="message-content">
            <div class="message-text">${escapeHtml(message.content)}</div>
            <div class="message-time">${timeString}</div>
        </div>
    `;
    
    // Добавляем сообщение в историю
    DOM.chatHistory.appendChild(messageElement);
    
    // Добавляем анимацию появления сообщения
    setTimeout(() => {
        messageElement.style.opacity = '1';
        messageElement.style.transform = 'translateY(0)';
    }, 10);
}

// Функция для отображения индикатора набора текста
function showTypingIndicator() {
    // Создаем элемент индикатора
    const typingElement = document.createElement('div');
    typingElement.className = 'chat-message bot typing-indicator';
    typingElement.id = 'typingIndicator';
    
    // Формируем HTML индикатора
    typingElement.innerHTML = `
        <div class="message-avatar">AI</div>
        <div class="message-content">
            <div class="typing-dots">
                <span></span>
                <span></span>
                <span></span>
            </div>
        </div>
    `;
    
    // Добавляем индикатор в историю
    DOM.chatHistory.appendChild(typingElement);
    
    // Прокручиваем к индикатору
    scrollToBottom();
}

// Функция для скрытия индикатора набора текста
function hideTypingIndicator() {
    const typingIndicator = document.getElementById('typingIndicator');
    if (typingIndicator) {
        typingIndicator.remove();
    }
}

// Функция для экранирования HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Функция для прокрутки к последнему сообщению
function scrollToBottom() {
    if (DOM.chatHistory) {
        // Плавная прокрутка к последнему сообщению
        DOM.chatHistory.scrollTo({
            top: DOM.chatHistory.scrollHeight,
            behavior: 'smooth'
        });
    }
}

// Функция для отображения индикатора загрузки
function showChatLoading() {
    if (DOM.chatLoading) {
        DOM.chatLoading.classList.add('show');
    }
    if (DOM.sendButton) {
        DOM.sendButton.disabled = true;
    }
    chatState.isProcessing = true;
}

// Функция для скрытия индикатора загрузки
function hideChatLoading() {
    if (DOM.chatLoading) {
        DOM.chatLoading.classList.remove('show');
    }
    if (DOM.sendButton) {
        DOM.sendButton.disabled = false;
    }
    chatState.isProcessing = false;
}

// Функция валидации сообщения
function validateMessage(message) {
    if (!message || message.trim().length === 0) {
        return 'Сообщение не может быть пустым';
    }
    
    if (message.length > CHAT_CONFIG.MAX_MESSAGE_LENGTH) {
        return `Сообщение слишком длинное. Максимум ${CHAT_CONFIG.MAX_MESSAGE_LENGTH} символов.`;
    }
    
    return null; // Валидация пройдена
}

// Функция для отправки сообщения
async function sendChatMessage() {
    // Проверяем состояние процесса
    if (chatState.isProcessing) return;
    
    const message = DOM.chatInput ? DOM.chatInput.value.trim() : '';
    
    // Валидация сообщения
    const validationError = validateMessage(message);
    if (validationError) {
        addMessage('bot', validationError);
        return;
    }
    
    // Очищаем поле ввода
    if (DOM.chatInput) {
        DOM.chatInput.value = '';
    }
    
    // Добавляем сообщение пользователя
    addMessage('user', message);
    
    // Показываем индикатор набора текста
    showTypingIndicator();
    
    try {
        // Отправляем запрос к API
        const url = new URL(CHAT_CONFIG.API_ENDPOINT, window.location.origin);
        console.log('Отправка запроса к:', url.toString());
        const response = await fetch(url.toString(), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ question: message })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error);
        }
        
        // Скрываем индикатор набора текста
        hideTypingIndicator();
        
        // Добавляем ответ нейросети
        addMessage('bot', data.answer);
        
    } catch (error) {
        console.error('Ошибка при отправке сообщения:', error);
        // Скрываем индикатор набора текста
        hideTypingIndicator();
        addMessage('bot', 'Произошла ошибка при обработке вашего запроса. Пожалуйста, попробуйте еще раз.');
    }
}

// Инициализация обработчиков событий
function initializeEventListeners() {
    // Обработчик для кнопки отправки
    if (DOM.sendButton) {
        DOM.sendButton.addEventListener('click', sendChatMessage);
    }
    
    // Обработчик для нажатия Enter в поле ввода
    if (DOM.chatInput) {
        DOM.chatInput.addEventListener('keypress', function(event) {
            if (event.key === 'Enter') {
                sendChatMessage();
            }
        });
    }
    
    // Закрытие чата при клике вне его
    window.addEventListener('click', function(event) {
        if (DOM.modal && event.target === DOM.modal) {
            closeChat();
        }
    });
    
    // Обработка события Escape для закрытия чата
    window.addEventListener('keydown', function(event) {
        if (event.key === 'Escape' && chatState.isOpen) {
            closeChat();
        }
    });
}

// Функция инициализации чата
function initChat() {
    initializeDOM();
    initializeEventListeners();
    
    // Добавляем обработчик для кнопки "Начать" на главной странице
    const startButton = document.querySelector('[onclick="openChat()"]');
    if (startButton) {
        startButton.onclick = null; // Удаляем старый обработчик
        startButton.addEventListener('click', (e) => {
            e.preventDefault();
            openChat();
        });
    }
}

// Инициализация чата при загрузке DOM
document.addEventListener('DOMContentLoaded', initChat);

// Анимация для прогресс-баров навыков
document.addEventListener('DOMContentLoaded', function() {
    const skillLevels = document.querySelectorAll('.skill-level');
    
    // Функция для анимации прогресс-баров
    function animateSkillBars() {
        skillLevels.forEach(skill => {
            const width = skill.style.width;
            skill.style.width = '0';
            setTimeout(() => {
                skill.style.width = width;
            }, 300);
        });
    }
    
    // Запуск анимации при загрузке страницы
    animateSkillBars();
    
    // Добавление плавного появления секций при прокрутке
    const sections = document.querySelectorAll('.resume-section, .resume-sidebar');
    
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);
    
    sections.forEach(section => {
        section.style.opacity = '0';
        section.style.transform = 'translateY(20px)';
        section.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(section);
    });
    
    // Анимация при наведении на элементы
    const hoverElements = document.querySelectorAll('.resume-contact-item, .skill-item, .timeline-item');
    
    hoverElements.forEach(element => {
        element.addEventListener('mouseenter', () => {
            element.style.transform = 'translateX(5px)';
        });
        
        element.addEventListener('mouseleave', () => {
            element.style.transform = 'translateX(0)';
        });
    });
});