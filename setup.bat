@echo off
echo 🚀 Настройка Flux Messenger...

:: Проверка Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js не установлен. Установите Node.js 16+ и попробуйте снова.
    pause
    exit /b 1
)

:: Проверка npm
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ npm не установлен. Установите npm и попробуйте снова.
    pause
    exit /b 1
)

echo ✅ Node.js и npm найдены

:: Установка зависимостей
echo 📦 Установка зависимостей...

echo 📦 Установка основных зависимостей...
npm install

echo 📦 Установка зависимостей сервера...
cd server
npm install

echo 📦 Установка зависимостей клиента...
cd ..\client
npm install

cd ..

echo ✅ Все зависимости установлены!

echo 🔧 Настройка переменных окружения...

:: Создание .env файла если его нет
if not exist "server\.env" (
    copy "server\.env.example" "server\.env"
    echo 📝 Создан файл server\.env из примера
    echo ⚠️  Не забудьте настроить DATABASE_URL и JWT_SECRET в server\.env
) else (
    echo ✅ Файл server\.env уже существует
)

echo.
echo 🎉 Настройка завершена!
echo.
echo 📋 Следующие шаги:
echo 1. Настройте базу данных PostgreSQL
echo 2. Обновите server\.env с правильными настройками
echo 3. Запустите: npm run dev
echo.
echo 🚀 Для деплоя на Railway следуйте инструкциям в DEPLOY.md
pause