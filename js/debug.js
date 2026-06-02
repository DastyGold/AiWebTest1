// Добавляем расширенное логирование для отладки
console.log('=== Инициализация чата ===');
console.log('DOM элементы:');
console.log('modal:', document.getElementById('chatModal'));
console.log('chatHistory:', document.getElementById('chatHistory'));
console.log('chatInput:', document.getElementById('chatInput'));
console.log('sendButton:', document.getElementById('sendButton'));
console.log('chatLoading:', document.getElementById('chatLoading'));

// Перехватываем ошибки fetch
const originalFetch = window.fetch;
window.fetch = async function(...args) {
    console.log('=== Запрос fetch ===');
    console.log('URL:', args[0]);
    console.log('Опции:', args[1]);
    
    try {
        const response = await originalFetch(...args);
        console.log('Ответ получен:', response.status, response.statusText);
        const responseClone = response.clone();
        const text = await responseClone.text();
        console.log('Тело ответа:', text);
        return response;
    } catch (error) {
        console.error('Ошибка fetch:', error);
        throw error;
    }
};

// Добавляем обработчик ошибок для API
window.addEventListener('error', function(e) {
    console.error('Глобальная ошибка:', e.error);
});

console.log('=== Отладочный скрипт загружен ===');