#!/bin/bash

echo "🚀 Настройка Flux Messenger..."

# Проверка Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js не установлен. Установите Node.js 16+ и попробуйте снова."
    exit 1
fi

# Проверка npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm не установлен. Установите npm и попробуйте снова."
    exit 1
fi

echo "✅ Node.js и npm найдены"

# Установка зависимостей
echo "📦 Установка зависимостей..."

echo "📦 Установка основных зависимостей..."
npm install

echo "📦 Установка зависимостей сервера..."
cd server && npm install

echo "📦 Установка зависимостей клиента..."
cd ../client && npm install

cd ..

echo "✅ Все зависимости установлены!"

echo "🔧 Настройка переменных окружения..."

# Создание .env файла если его нет
if [ ! -f "server/.env" ]; then
    cp server/.env.example server/.env
    echo "📝 Создан файл server/.env из примера"
    echo "⚠️  Не забудьте настроить DATABASE_URL и JWT_SECRET в server/.env"
else
    echo "✅ Файл server/.env уже существует"
fi

echo ""
echo "🎉 Настройка завершена!"
echo ""
echo "📋 Следующие шаги:"
echo "1. Настройте базу данных PostgreSQL"
echo "2. Обновите server/.env с правильными настройками"
echo "3. Запустите: npm run dev"
echo ""
echo "🚀 Для деплоя на Railway следуйте инструкциям в DEPLOY.md"