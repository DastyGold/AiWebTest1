const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Создаем соединение с базой данных SQLite
const db = new sqlite3.Database(path.join(__dirname, 'feedback.db'), (err) => {
  if (err) {
    console.error('Ошибка при подключении к базе данных:', err.message);
  } else {
    console.log('Подключение к базе данных SQLite установлено');
  }
});

// Создаем таблицу для хранения сообщений обратной связи
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`, (err) => {
    if (err) {
      console.error('Ошибка при создании таблицы feedback:', err.message);
    } else {
      console.log('Таблица feedback готова к использованию');
    }
  });
});

// Функция для сохранения сообщения обратной связи в базу данных
function saveFeedback(name, email, subject, message, callback) {
  const sql = `INSERT INTO feedback (name, email, subject, message) VALUES (?, ?, ?, ?)`;
  
  db.run(sql, [name, email, subject, message], function(err) {
    if (err) {
      console.error('Ошибка при сохранении сообщения обратной связи:', err.message);
      callback(err, null);
    } else {
      console.log(`Сообщение обратной связи сохранено с ID ${this.lastID}`);
      callback(null, this.lastID);
    }
  });
}

// Функция для получения всех сообщений обратной связи
function getAllFeedback(callback) {
  const sql = `SELECT * FROM feedback ORDER BY created_at DESC`;
  
  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error('Ошибка при получении сообщений обратной связи:', err.message);
      callback(err, null);
    } else {
      callback(null, rows);
    }
  });
}

// Функция для получения сообщения обратной связи по ID
function getFeedbackById(id, callback) {
  const sql = `SELECT * FROM feedback WHERE id = ?`;
  
  db.get(sql, [id], (err, row) => {
    if (err) {
      console.error('Ошибка при получении сообщения обратной связи:', err.message);
      callback(err, null);
    } else {
      callback(null, row);
    }
  });
}

// Экспортируем функции для использования в других модулях
module.exports = {
  saveFeedback,
  getAllFeedback,
  getFeedbackById
};