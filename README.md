# 🚀 Flux Messenger - ГОТОВ К ДЕПЛОЮ!

Современный веб-мессенджер с видеозвонками, построенный на React, Node.js и PostgreSQL.

## ✨ Возможности

- 🔐 **Аутентификация** - Регистрация и вход с JWT токенами
- 💬 **Чаты в реальном времени** - Мгновенные сообщения через WebSocket
- 📞 **Видео/аудио звонки** - WebRTC интеграция для звонков
- 🎨 **Современный UI** - Красивый интерфейс с темной темой
- 📱 **Адаптивный дизайн** - Работает на всех устройствах
- 🔍 **Поиск** - Быстрый поиск по чатам и сообщениям

## 🚀 ДЕПЛОЙ НА RAILWAY

### 1. Создайте проект на Railway
1. Зайдите на [railway.app](https://railway.app)
2. Создайте новый проект
3. Загрузите эту папку или подключите GitHub

### 2. Добавьте PostgreSQL
1. Нажмите "New Service"
2. Выберите "PostgreSQL"
3. Дождитесь создания

### 3. Настройте переменные окружения
```
NODE_ENV=production
JWT_SECRET=flux_super_secret_key_2024_make_it_very_long_and_secure
```

### 4. Деплой готов!
Railway автоматически:
- Установит зависимости
- Соберет React приложение
- Запустит сервер
- Предоставит HTTPS URL

## 🛠 Технологии

### Frontend
- React 18 + TypeScript
- Tailwind CSS
- Socket.io Client
- Simple Peer (WebRTC)

### Backend
- Node.js + Express
- Socket.io
- PostgreSQL
- JWT Authentication

## 📁 Структура

```
flux-deploy/
├── client/          # React приложение
├── server/          # Node.js сервер
├── package.json     # Основной package.json
├── nixpacks.toml    # Конфигурация Railway
└── railway.json     # Настройки Railway
```

## 🎯 После деплоя

1. Откройте URL приложения
2. Зарегистрируйтесь
3. Попробуйте чат
4. Протестируйте видеозвонки

---

**ГОТОВ К ИСПОЛЬЗОВАНИЮ! 🎉**