# 🚀 Инструкция по деплою на Railway

## ✅ **Проблема исправлена!**

Ошибка `npm ci` была из-за несинхронизированного package-lock.json. Теперь все исправлено:

- ✅ Обновлен package-lock.json
- ✅ Обновлен multer до безопасной версии
- ✅ Добавлен dotenv
- ✅ Сервер запускается без ошибок

## 📋 **Шаги для деплоя:**

### 1. **Коммит изменений**
```bash
git add .
git commit -m "Fix: Update package-lock.json and add PostgreSQL support"
git push origin main
```

### 2. **Добавить PostgreSQL в Railway**
1. Откройте ваш проект: https://railway.app/project/your-project-id
2. Нажмите **"+ New"** → **"Database"** → **"Add PostgreSQL"
3. Railway автоматически создаст переменную `DATABASE_URL`

### 3. **Проверить переменные окружения**
В разделе **Variables** должны быть:
```
DATABASE_URL=postgresql://postgres:...  (автоматически от PostgreSQL)
JWT_SECRET=flux-messenger-super-secret-jwt-key-2024-railway
NODE_ENV=production
```

### 4. **Деплой**
Railway автоматически задеплоит после push в Git.

## 🔍 **Что проверить в логах:**

### **Успешный деплой:**
```
✅ Подключение к PostgreSQL установлено
✅ Модели базы данных синхронизированы
✅ Используем PostgreSQL базу данных
🚀 Flux Messenger запущен на порту 3000
📊 База данных: PostgreSQL
```

### **Если PostgreSQL не подключен:**
```
⚠️ DATABASE_URL не найден, работаем без базы данных
⚠️ Используем временное хранилище в памяти
📊 База данных: Memory (fallback)
🔥 Тестовый пользователь создан: test@test.com / password
```

## 🎯 **После успешного деплоя:**

### **Тестирование:**
1. Откройте ваш Railway URL
2. Зарегистрируйте нового пользователя
3. Попробуйте найти других пользователей (кнопка 👥)
4. Создайте чат и отправьте сообщение
5. Обновите профиль в настройках

### **API endpoints работают:**
- `POST /api/register` - регистрация
- `POST /api/login` - авторизация
- `GET /api/users/search?q=query` - поиск пользователей
- `GET /api/users/recommended` - рекомендуемые пользователи
- `GET /api/messages/:chatId` - сообщения чата
- `PUT /api/profile/update` - обновление профиля

## 🚨 **Если что-то не работает:**

### **Проверьте Dockerfile:**
Убедитесь что в Dockerfile используется правильная команда:
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

### **Проверьте package.json scripts:**
```json
{
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  }
}
```

### **Локальная отладка:**
```bash
# Проверить зависимости
npm install

# Запустить локально
npm start

# Проверить API
curl http://localhost:3000/api/me
```

## 🎉 **Результат:**

После успешного деплоя у вас будет:
- ✅ Полностью рабочий мессенджер на Railway
- ✅ PostgreSQL база данных с постоянным хранением
- ✅ Все API endpoints работают
- ✅ Регистрация, чаты, сообщения сохраняются
- ✅ Поиск пользователей и настройки профиля

**Ваш мессенджер готов к использованию! 🚀**