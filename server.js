const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const fs = require('fs');
const { Op } = require('sequelize');

// Импорт моделей базы данных
const { 
    sequelize, 
    User, 
    Chat, 
    ChatParticipant, 
    Message, 
    File, 
    initDatabase 
} = require('./models/database');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'flux-secret-key-change-in-production';

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Создаем папку для загрузок
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// ИМБОВАЯ настройка multer для загрузки файлов
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        // ИМБОВАЯ очистка имени файла
        const timestamp = Date.now();
        const randomId = Math.round(Math.random() * 1E9);
        
        // Получаем расширение файла
        const ext = path.extname(file.originalname).toLowerCase();
        
        // Очищаем имя файла от всех спецсимволов
        const cleanName = file.originalname
            .replace(ext, '') // Убираем расширение
            .replace(/[^\w\s-]/g, '') // Убираем все кроме букв, цифр, пробелов и дефисов
            .replace(/\s+/g, '_') // Заменяем пробелы на подчеркивания
            .replace(/_+/g, '_') // Убираем множественные подчеркивания
            .toLowerCase()
            .substring(0, 50); // Ограничиваем длину
        
        const finalName = `${timestamp}-${randomId}-${cleanName}${ext}`;
        
        console.log('🔥 СОХРАНЯЕМ ФАЙЛ:', finalName);
        console.log('🔥 ОРИГИНАЛЬНОЕ ИМЯ:', file.originalname);
        
        cb(null, finalName);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB лимит
    },
    fileFilter: (req, file, cb) => {
        // Разрешенные типы файлов
        const allowedTypes = /jpeg|jpg|png|gif|webp|mp4|mov|avi|webm|pdf|doc|docx|txt|zip|rar/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Неподдерживаемый тип файла'));
        }
    }
});

// Раздача загруженных файлов - ИМБОВАЯ ВЕРСИЯ С УЛУЧШЕННОЙ ОБРАБОТКОЙ
app.use('/uploads', (req, res, next) => {
    try {
        // Многоуровневое декодирование URL для правильной обработки кириллицы
        let decodedPath = req.path;
        
        // Декодируем несколько раз для обработки двойного кодирования
        for (let i = 0; i < 3; i++) {
            try {
                const newPath = decodeURIComponent(decodedPath);
                if (newPath === decodedPath) break; // Больше нечего декодировать
                decodedPath = newPath;
            } catch (e) {
                break; // Ошибка декодирования, останавливаемся
            }
        }
        
        const fileName = path.basename(decodedPath);
        const filePath = path.join(uploadsDir, fileName);
        
        console.log('🔥 ЗАПРОС ФАЙЛА:', req.path);
        console.log('🔥 ДЕКОДИРОВАННЫЙ:', decodedPath);
        console.log('🔥 ИМЯ ФАЙЛА:', fileName);
        console.log('🔥 ПОЛНЫЙ ПУТЬ:', filePath);
        
        // Проверяем существование файла
        if (fs.existsSync(filePath)) {
            // Устанавливаем правильные заголовки
            const ext = path.extname(filePath).toLowerCase();
            const mimeTypes = {
                '.jpg': 'image/jpeg',
                '.jpeg': 'image/jpeg', 
                '.png': 'image/png',
                '.gif': 'image/gif',
                '.webp': 'image/webp',
                '.mp4': 'video/mp4',
                '.webm': 'video/webm',
                '.mov': 'video/quicktime',
                '.avi': 'video/x-msvideo',
                '.pdf': 'application/pdf',
                '.txt': 'text/plain',
                '.doc': 'application/msword',
                '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                '.zip': 'application/zip',
                '.rar': 'application/x-rar-compressed'
            };
            
            const mimeType = mimeTypes[ext] || 'application/octet-stream';
            res.setHeader('Content-Type', mimeType);
            res.setHeader('Cache-Control', 'public, max-age=86400');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(fileName)}`);
            
            console.log('✅ ФАЙЛ НАЙДЕН, ОТПРАВЛЯЕМ:', mimeType);
            
            // Отправляем файл
            res.sendFile(filePath, (err) => {
                if (err) {
                    console.error('❌ ОШИБКА ОТПРАВКИ ФАЙЛА:', err);
                    res.status(500).json({ error: 'Ошибка отправки файла' });
                }
            });
        } else {
            console.log('❌ ФАЙЛ НЕ НАЙДЕН:', filePath);
            
            // ИМБОВЫЙ поиск файла с похожим именем
            try {
                const files = fs.readdirSync(uploadsDir);
                console.log('🔍 ДОСТУПНЫЕ ФАЙЛЫ:', files.slice(0, 5)); // Показываем первые 5 для отладки
                
                // Извлекаем основную часть имени файла (без timestamp и random)
                const requestedBaseName = fileName.replace(/^\d+-\d+-/, '').toLowerCase();
                console.log('🔍 ИЩЕМ БАЗОВОЕ ИМЯ:', requestedBaseName);
                
                const similarFile = files.find(file => {
                    const fileBaseName = file.replace(/^\d+-\d+-/, '').toLowerCase();
                    return fileBaseName === requestedBaseName || 
                           fileBaseName.includes(requestedBaseName) ||
                           requestedBaseName.includes(fileBaseName);
                });
                
                if (similarFile) {
                    console.log('🎯 НАЙДЕН ПОХОЖИЙ ФАЙЛ:', similarFile);
                    const similarPath = path.join(uploadsDir, similarFile);
                    
                    // Устанавливаем заголовки для найденного файла
                    const ext = path.extname(similarFile).toLowerCase();
                    const mimeTypes = {
                        '.jpg': 'image/jpeg',
                        '.jpeg': 'image/jpeg', 
                        '.png': 'image/png',
                        '.gif': 'image/gif',
                        '.webp': 'image/webp',
                        '.mp4': 'video/mp4',
                        '.webm': 'video/webm',
                        '.mov': 'video/quicktime',
                        '.avi': 'video/x-msvideo'
                    };
                    
                    const mimeType = mimeTypes[ext] || 'application/octet-stream';
                    res.setHeader('Content-Type', mimeType);
                    res.setHeader('Cache-Control', 'public, max-age=86400');
                    res.setHeader('Access-Control-Allow-Origin', '*');
                    
                    res.sendFile(similarPath);
                } else {
                    console.log('❌ ПОХОЖИЙ ФАЙЛ НЕ НАЙДЕН');
                    res.status(404).json({ 
                        error: 'Файл не найден',
                        requested: fileName,
                        available: files.length > 0 ? files.slice(0, 3) : []
                    });
                }
            } catch (dirError) {
                console.error('❌ ОШИБКА ЧТЕНИЯ ДИРЕКТОРИИ:', dirError);
                res.status(500).json({ error: 'Ошибка доступа к файлам' });
            }
        }
    } catch (error) {
        console.error('💥 КРИТИЧЕСКАЯ ОШИБКА UPLOADS:', error);
        res.status(500).json({ error: 'Ошибка сервера при обработке файла' });
    }
});

// Убираем дублирующий обработчик ошибок

// Временное хранилище для онлайн пользователей и комнат видеозвонков
const onlineUsers = new Map();
const rooms = new Map();

// Fallback хранилище если база данных недоступна
const users = new Map();
const chats = new Map();
const messages = new Map();

// Флаг использования базы данных
let useDatabase = false;

// API Routes

// Регистрация
app.post('/api/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        
        if (useDatabase) {
            // Используем PostgreSQL
            const existingUser = await User.findOne({
                where: {
                    [Op.or]: [
                        { email: email },
                        { username: username }
                    ]
                }
            });
            
            if (existingUser) {
                return res.status(400).json({ error: 'Пользователь уже существует' });
            }
            
            const hashedPassword = await bcrypt.hash(password, 10);
            
            const user = await User.create({
                username,
                email,
                password: hashedPassword,
                avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`
            });
            
            const token = jwt.sign({ userId: user.id, username }, JWT_SECRET, { expiresIn: '7d' });
            
            res.json({
                success: true,
                token,
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    avatar: user.avatar
                }
            });
        } else {
            // Используем Map (fallback)
            const existingUser = Array.from(users.values()).find(u => 
                u.email === email || u.username === username
            );
            
            if (existingUser) {
                return res.status(400).json({ error: 'Пользователь уже существует' });
            }
            
            const hashedPassword = await bcrypt.hash(password, 10);
            const userId = uuidv4();
            
            const user = {
                id: userId,
                username,
                email,
                password: hashedPassword,
                avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
                lastSeen: new Date(),
                createdAt: new Date()
            };
            
            users.set(userId, user);
            
            const token = jwt.sign({ userId, username }, JWT_SECRET, { expiresIn: '7d' });
            
            res.json({
                success: true,
                token,
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    avatar: user.avatar
                }
            });
        }
    } catch (error) {
        console.error('Ошибка регистрации:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Авторизация
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (useDatabase) {
            // Используем PostgreSQL
            const user = await User.findOne({ where: { email } });
            if (!user) {
                return res.status(400).json({ error: 'Неверные данные' });
            }
            
            const isValidPassword = await bcrypt.compare(password, user.password);
            if (!isValidPassword) {
                return res.status(400).json({ error: 'Неверные данные' });
            }
            
            await user.update({ lastSeen: new Date() });
            
            const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
            
            res.json({
                success: true,
                token,
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    avatar: user.avatar
                }
            });
        } else {
            // Используем Map (fallback)
            const user = Array.from(users.values()).find(u => u.email === email);
            if (!user) {
                return res.status(400).json({ error: 'Неверные данные' });
            }
            
            const isValidPassword = await bcrypt.compare(password, user.password);
            if (!isValidPassword) {
                return res.status(400).json({ error: 'Неверные данные' });
            }
            
            user.lastSeen = new Date();
            
            const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
            
            res.json({
                success: true,
                token,
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    avatar: user.avatar
                }
            });
        }
    } catch (error) {
        console.error('Ошибка авторизации:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Обновление профиля
app.put('/api/profile', authenticateToken, async (req, res) => {
    try {
        const { username, avatar, password } = req.body;
        
        if (useDatabase) {
            // Используем PostgreSQL
            const user = await User.findByPk(req.userId);
            if (!user) {
                return res.status(404).json({ error: 'Пользователь не найден' });
            }

            // Проверяем уникальность username
            if (username && username !== user.username) {
                const existingUser = await User.findOne({
                    where: {
                        username: username,
                        id: { [Op.ne]: req.userId }
                    }
                });
                if (existingUser) {
                    return res.status(400).json({ error: 'Имя пользователя уже занято' });
                }
            }

            // Обновляем данные
            const updateData = {};
            if (username) updateData.username = username;
            if (avatar) updateData.avatar = avatar;
            if (password) updateData.password = await bcrypt.hash(password, 10);

            await user.update(updateData);

            res.json({
                success: true,
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    avatar: user.avatar
                }
            });
        } else {
            // Используем Map (fallback)
            const user = users.get(req.userId);
            
            if (!user) {
                return res.status(404).json({ error: 'Пользователь не найден' });
            }

            // Проверяем уникальность username
            if (username && username !== user.username) {
                const existingUser = Array.from(users.values()).find(u => u.username === username && u.id !== req.userId);
                if (existingUser) {
                    return res.status(400).json({ error: 'Имя пользователя уже занято' });
                }
                user.username = username;
            }

            // Обновляем аватар
            if (avatar) {
                user.avatar = avatar;
            }

            // Обновляем пароль
            if (password) {
                user.password = await bcrypt.hash(password, 10);
            }

            user.updatedAt = new Date();

            res.json({
                success: true,
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    avatar: user.avatar
                }
            });
        }
    } catch (error) {
        console.error('Ошибка обновления профиля:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Получить информацию о текущем пользователе
app.get('/api/me', authenticateToken, async (req, res) => {
    try {
        if (useDatabase) {
            // Используем PostgreSQL
            const user = await User.findByPk(req.userId);
            if (!user) {
                return res.status(404).json({ error: 'Пользователь не найден' });
            }
            
            res.json({
                success: true,
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    avatar: user.avatar
                }
            });
        } else {
            // Используем Map (fallback)
            const user = users.get(req.userId);
            if (!user) {
                return res.status(404).json({ error: 'Пользователь не найден' });
            }
            
            res.json({
                success: true,
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    avatar: user.avatar
                }
            });
        }
    } catch (error) {
        console.error('Ошибка получения пользователя:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Получить список пользователей
app.get('/api/users', authenticateToken, async (req, res) => {
    try {
        if (useDatabase) {
            // Используем PostgreSQL
            const allUsers = await User.findAll({
                where: {
                    id: {
                        [Op.ne]: req.userId // Исключаем текущего пользователя
                    }
                },
                attributes: ['id', 'username', 'avatar', 'lastSeen'],
                order: [['username', 'ASC']]
            });
            
            const userList = allUsers.map(user => ({
                id: user.id,
                username: user.username,
                avatar: user.avatar,
                isOnline: onlineUsers.has(user.id),
                lastSeen: user.lastSeen
            }));
            
            res.json({ success: true, users: userList });
        } else {
            // Используем Map (fallback)
            const userList = Array.from(users.values()).map(user => ({
                id: user.id,
                username: user.username,
                avatar: user.avatar,
                isOnline: onlineUsers.has(user.id),
                lastSeen: user.lastSeen
            })).filter(user => user.id !== req.userId);
            
            res.json({ success: true, users: userList });
        }
    } catch (error) {
        console.error('Ошибка получения пользователей:', error);
        res.status(500).json({ success: false, message: 'Ошибка сервера' });
    }
});

// Получить чаты пользователя
app.get('/api/chats', authenticateToken, async (req, res) => {
    try {
        if (useDatabase) {
            // Используем PostgreSQL - упрощенный запрос
            const userChatParticipants = await ChatParticipant.findAll({
                where: { userId: req.userId },
                include: [{ model: Chat }]
            });
            
            const chatList = [];
            
            for (const chatParticipant of userChatParticipants) {
                const chat = chatParticipant.Chat;
                
                // Находим другого участника чата
                const otherParticipant = await ChatParticipant.findOne({
                    where: { 
                        chatId: chat.id,
                        userId: { [Op.ne]: req.userId }
                    },
                    include: [{ model: User, attributes: ['id', 'username', 'avatar'] }]
                });
                
                if (!otherParticipant) continue;
                
                // Находим последнее сообщение
                const lastMessage = await Message.findOne({
                    where: { chatId: chat.id },
                    order: [['createdAt', 'DESC']],
                    include: [{ model: User, as: 'sender', attributes: ['username'] }]
                });
                
                chatList.push({
                    id: chat.id,
                    name: otherParticipant.User.username,
                    avatar: otherParticipant.User.avatar,
                    isOnline: onlineUsers.has(otherParticipant.User.id),
                    lastMessage: lastMessage ? lastMessage.text : null,
                    lastMessageTime: lastMessage ? lastMessage.createdAt : null,
                    unreadCount: 0 // TODO: Implement unread count
                });
            }
            
            res.json({ success: true, chats: chatList });
        } else {
            // Используем Map (fallback)
            const userChats = Array.from(chats.values()).filter(chat => 
                chat.participants.includes(req.userId)
            ).map(chat => {
                const otherUserId = chat.participants.find(id => id !== req.userId);
                const otherUser = users.get(otherUserId);
                const chatMessages = messages.get(chat.id) || [];
                const lastMessage = chatMessages[chatMessages.length - 1];
                
                return {
                    id: chat.id,
                    name: otherUser ? otherUser.username : 'Неизвестный пользователь',
                    avatar: otherUser ? otherUser.avatar : null,
                    isOnline: otherUser ? onlineUsers.has(otherUser.id) : false,
                    lastMessage: lastMessage ? lastMessage.text : null,
                    lastMessageTime: lastMessage ? lastMessage.timestamp : null,
                    unreadCount: chatMessages.filter(msg => 
                        msg.sender !== req.userId && !msg.read
                    ).length
                };
            });
            
            res.json({ success: true, chats: userChats });
        }
    } catch (error) {
        console.error('Ошибка получения чатов:', error);
        res.status(500).json({ success: false, message: 'Ошибка сервера' });
    }
});

// Создать чат с пользователем
app.post('/api/chats/create', authenticateToken, async (req, res) => {
    try {
        const { userId } = req.body;
        
        if (!userId) {
            return res.status(400).json({ success: false, message: 'ID пользователя обязателен' });
        }
        
        if (useDatabase) {
            // Проверяем, существует ли уже чат между этими пользователями
            const existingChatParticipants = await ChatParticipant.findAll({
                where: { userId: [req.userId, userId] },
                include: [{ model: Chat, where: { type: 'private' } }]
            });
            
            // Группируем по chatId и ищем чат с обоими участниками
            const chatCounts = {};
            existingChatParticipants.forEach(participant => {
                const chatId = participant.Chat.id;
                chatCounts[chatId] = (chatCounts[chatId] || 0) + 1;
            });
            
            const existingChatId = Object.keys(chatCounts).find(chatId => chatCounts[chatId] === 2);
            
            if (existingChatId) {
                // Чат уже существует
                const existingChat = await Chat.findByPk(existingChatId);
                const otherUser = await User.findByPk(userId, {
                    attributes: ['id', 'username', 'avatar']
                });
                
                return res.json({
                    success: true,
                    chat: {
                        id: existingChat.id,
                        name: otherUser.username,
                        avatar: otherUser.avatar,
                        isOnline: onlineUsers.has(otherUser.id),
                        lastMessage: null,
                        lastMessageTime: null,
                        unreadCount: 0
                    }
                });
            }
            
            // Создаем новый чат
            const chat = await Chat.create({
                type: 'private'
            });
            
            // Добавляем участников
            await ChatParticipant.bulkCreate([
                { chatId: chat.id, userId: req.userId },
                { chatId: chat.id, userId: userId }
            ]);
            
            const otherUser = await User.findByPk(userId, {
                attributes: ['id', 'username', 'avatar']
            });
            
            res.json({
                success: true,
                chat: {
                    id: chat.id,
                    name: otherUser.username,
                    avatar: otherUser.avatar,
                    isOnline: onlineUsers.has(otherUser.id),
                    lastMessage: null,
                    lastMessageTime: null,
                    unreadCount: 0
                }
            });
        } else {
            // Используем Map (fallback)
            const existingChat = Array.from(chats.values()).find(chat =>
                chat.participants.includes(req.userId) && chat.participants.includes(userId)
            );
            
            if (existingChat) {
                const otherUser = users.get(userId);
                return res.json({
                    success: true,
                    chat: {
                        id: existingChat.id,
                        name: otherUser.username,
                        avatar: otherUser.avatar,
                        isOnline: onlineUsers.has(otherUser.id),
                        lastMessage: null,
                        lastMessageTime: null,
                        unreadCount: 0
                    }
                });
            }
            
            // Создаем новый чат
            const chatId = Date.now().toString();
            const chat = {
                id: chatId,
                participants: [req.userId, userId],
                type: 'private',
                createdAt: new Date()
            };
            
            chats.set(chatId, chat);
            messages.set(chatId, []);
            
            const otherUser = users.get(userId);
            res.json({
                success: true,
                chat: {
                    id: chatId,
                    name: otherUser.username,
                    avatar: otherUser.avatar,
                    isOnline: onlineUsers.has(otherUser.id),
                    lastMessage: null,
                    lastMessageTime: null,
                    unreadCount: 0
                }
            });
        }
    } catch (error) {
        console.error('Ошибка создания чата:', error);
        res.status(500).json({ success: false, message: 'Ошибка сервера' });
    }
});

// Получить сообщения чата
app.get('/api/chats/:chatId/messages', authenticateToken, async (req, res) => {
    try {
        const { chatId } = req.params;
        
        if (useDatabase) {
            // Используем PostgreSQL
            // Проверяем доступ к чату
            const chatParticipant = await ChatParticipant.findOne({
                where: {
                    chatId: chatId,
                    userId: req.userId
                }
            });
            
            if (!chatParticipant) {
                return res.status(403).json({ error: 'Доступ запрещен' });
            }
            
            // Получаем сообщения
            const chatMessages = await Message.findAll({
                where: { chatId: chatId },
                include: [{ model: User, as: 'sender', attributes: ['username'] }],
                order: [['createdAt', 'ASC']]
            });
            
            const formattedMessages = chatMessages.map(msg => ({
                id: msg.id,
                sender: msg.senderId,
                senderName: msg.sender.username,
                text: msg.text,
                type: msg.type,
                fileData: msg.fileData,
                timestamp: msg.createdAt,
                read: msg.isRead
            }));
            
            res.json({ success: true, messages: formattedMessages });
        } else {
            // Используем Map (fallback)
            const chat = chats.get(chatId);
            
            if (!chat || !chat.participants.includes(req.userId)) {
                return res.status(403).json({ success: false, message: 'Доступ запрещен' });
            }
            
            const chatMessages = messages.get(chatId) || [];
            res.json({ success: true, messages: chatMessages });
        }
    } catch (error) {
        console.error('Ошибка получения сообщений:', error);
        res.status(500).json({ success: false, message: 'Ошибка сервера' });
    }
});

// ИМБОВЫЙ API для групповых чатов
app.post('/api/groups', authenticateToken, async (req, res) => {
    try {
        const { name, description, participants } = req.body;
        
        if (!name || !participants || participants.length < 2) {
            return res.status(400).json({ error: 'Название и минимум 2 участника обязательны' });
        }
        
        if (participants.length > 99) {
            return res.status(400).json({ error: 'Максимум 100 участников в группе' });
        }
        
        if (useDatabase) {
            // Создаем групповой чат
            const chat = await Chat.create({
                type: 'group',
                name: name,
                description: description || null
            });
            
            // Добавляем создателя как владельца
            const allParticipants = [
                { chatId: chat.id, userId: req.userId, role: 'owner' },
                ...participants.map(userId => ({ chatId: chat.id, userId, role: 'member' }))
            ];
            
            await ChatParticipant.bulkCreate(allParticipants);
            
            res.json({
                success: true,
                chatId: chat.id,
                message: 'Группа создана успешно'
            });
            
            // Уведомляем всех участников о новой группе
            participants.forEach(userId => {
                const userSocketId = onlineUsers.get(userId);
                if (userSocketId) {
                    io.to(userSocketId).emit('new-group-chat', { 
                        chatId: chat.id,
                        name: name,
                        createdBy: req.username
                    });
                }
            });
            
        } else {
            // Fallback для Map
            const chatId = uuidv4();
            const chat = {
                id: chatId,
                type: 'group',
                name: name,
                description: description || null,
                participants: [req.userId, ...participants],
                owner: req.userId,
                createdAt: new Date()
            };
            
            chats.set(chatId, chat);
            messages.set(chatId, []);
            
            res.json({
                success: true,
                chatId: chatId,
                message: 'Группа создана успешно'
            });
            
            // Уведомляем участников
            participants.forEach(userId => {
                const userSocketId = onlineUsers.get(userId);
                if (userSocketId) {
                    io.to(userSocketId).emit('new-group-chat', { 
                        chatId: chatId,
                        name: name,
                        createdBy: req.username
                    });
                }
            });
        }
        
    } catch (error) {
        console.error('Ошибка создания группы:', error);
        res.status(500).json({ error: 'Ошибка создания группы' });
    }
});

// Отправить сообщение
app.post('/api/messages', authenticateToken, async (req, res) => {
    try {
        const { chatId, text, type = 'text', fileData } = req.body;
        
        if (!chatId) {
            return res.status(400).json({ success: false, message: 'ID чата обязателен' });
        }
        
        if (!text && !fileData) {
            return res.status(400).json({ success: false, message: 'Текст сообщения или файл обязательны' });
        }
        
        console.log('🔥 Создаем сообщение:', { chatId, text, type, hasFile: !!fileData });
        
        if (useDatabase) {
            // Проверяем, что пользователь участник чата
            const participant = await ChatParticipant.findOne({
                where: { chatId, userId: req.userId }
            });
            
            if (!participant) {
                return res.status(403).json({ success: false, message: 'Доступ запрещен' });
            }
            
            // Создаем сообщение
            const message = await Message.create({
                chatId,
                senderId: req.userId,
                text: text || '',
                type: type,
                fileData: fileData || null
            });
            
            // Получаем данные отправителя
            const sender = await User.findByPk(req.userId, {
                attributes: ['id', 'username', 'avatar']
            });
            
            const messageData = {
                id: message.id,
                chatId: message.chatId,
                senderId: message.senderId,
                text: message.text,
                type: message.type,
                fileData: message.fileData,
                timestamp: message.createdAt,
                sender: {
                    id: sender.id,
                    username: sender.username,
                    avatar: sender.avatar
                }
            };
            
            console.log('🔥 Сообщение создано:', messageData);
            
            // Отправляем через Socket.IO всем участникам чата
            const participants = await ChatParticipant.findAll({
                where: { chatId },
                include: [{ model: User, attributes: ['id'] }]
            });
            
            participants.forEach(participant => {
                const userId = participant.User.id;
                const userSockets = Array.from(io.sockets.sockets.values())
                    .filter(socket => socket.userId === userId);
                
                userSockets.forEach(socket => {
                    socket.emit('new-message', messageData);
                });
            });
            
            res.json({ success: true, message: messageData });
        } else {
            // Используем Map (fallback)
            const chat = chats.get(chatId);
            
            if (!chat || !chat.participants.includes(req.userId)) {
                return res.status(403).json({ success: false, message: 'Доступ запрещен' });
            }
            
            const messageId = Date.now().toString();
            const sender = users.get(req.userId);
            
            const messageData = {
                id: messageId,
                chatId,
                senderId: req.userId,
                text: text || '',
                type: type,
                fileData: fileData || null,
                timestamp: new Date(),
                sender: {
                    id: sender.id,
                    username: sender.username,
                    avatar: sender.avatar
                }
            };
            
            // Добавляем сообщение в хранилище
            const chatMessages = messages.get(chatId) || [];
            chatMessages.push(messageData);
            messages.set(chatId, chatMessages);
            
            console.log('🔥 Сообщение добавлено в Map:', messageData);
            
            // Отправляем через Socket.IO всем участникам чата
            chat.participants.forEach(userId => {
                const userSockets = Array.from(io.sockets.sockets.values())
                    .filter(socket => socket.userId === userId);
                
                userSockets.forEach(socket => {
                    socket.emit('new-message', messageData);
                });
            });
            
            res.json({ success: true, message: messageData });
        }
    } catch (error) {
        console.error('🔥 Ошибка отправки сообщения:', error);
        res.status(500).json({ success: false, message: 'Ошибка сервера' });
    }
});

// Загрузка файлов
app.post('/api/upload', authenticateToken, (req, res) => {
    upload.single('file')(req, res, (err) => {
        if (err) {
            console.error('Ошибка загрузки файла:', err);
            if (err instanceof multer.MulterError) {
                if (err.code === 'LIMIT_FILE_SIZE') {
                    return res.status(400).json({ error: 'Файл слишком большой (максимум 50MB)' });
                }
            }
            return res.status(400).json({ error: err.message || 'Ошибка загрузки файла' });
        }

        try {
            if (!req.file) {
                return res.status(400).json({ error: 'Файл не загружен' });
            }

            const fileInfo = {
                id: uuidv4(),
                originalName: req.file.originalname,
                filename: req.file.filename,
                size: req.file.size,
                mimetype: req.file.mimetype,
                url: `/uploads/${req.file.filename}`,
                uploadedBy: req.userId,
                uploadedAt: new Date()
            };

            console.log('Файл успешно загружен:', fileInfo.url);

            res.json({
                success: true,
                file: fileInfo
            });
        } catch (error) {
            console.error('Ошибка обработки файла:', error);
            res.status(500).json({ error: 'Ошибка обработки файла' });
        }
    });
});

// Middleware для проверки токена
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'Токен не предоставлен' });
    }
    
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Недействительный токен' });
        }
        req.userId = user.userId;
        req.username = user.username;
        next();
    });
}

// WebSocket соединения
io.on('connection', (socket) => {
    console.log('Пользователь подключился:', socket.id);
    
    // Аутентификация через WebSocket
    socket.on('authenticate', (token) => {
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            socket.userId = decoded.userId;
            socket.username = decoded.username;
            
            // Добавляем в онлайн
            onlineUsers.set(decoded.userId, socket.id);
            
            // Уведомляем всех о статусе онлайн
            socket.broadcast.emit('user-online', decoded.userId);
            
            socket.emit('authenticated', { success: true });
        } catch (error) {
            socket.emit('auth-error', { error: 'Недействительный токен' });
        }
    });
    
    // Присоединение к чату
    socket.on('join-chat', (chatId) => {
        socket.join(chatId);
    });
    
    // Отправка сообщения
    socket.on('send-message', async (data) => {
        const { chatId, text, type = 'text', fileData, replyTo } = data;
        
        if (!socket.userId) return;
        
        try {
            if (useDatabase) {
                // Используем PostgreSQL
                const message = await Message.create({
                    chatId: chatId,
                    senderId: socket.userId,
                    text: text,
                    type: type,
                    fileData: fileData || null,
                    replyTo: replyTo || null,
                    isRead: false
                });
                
                // Получаем данные отправителя
                const sender = await User.findByPk(socket.userId);
                
                const messageData = {
                    id: message.id,
                    sender: message.senderId,
                    senderName: sender.username,
                    text: message.text,
                    type: message.type,
                    fileData: message.fileData,
                    replyTo: message.replyTo,
                    reactions: {},
                    timestamp: message.createdAt,
                    read: message.isRead
                };
                
                // Отправляем всем участникам чата
                io.to(chatId).emit('new-message', { chatId, message: messageData });
            } else {
                // Используем Map (fallback)
                const message = {
                    id: uuidv4(),
                    sender: socket.userId,
                    senderName: socket.username,
                    text,
                    type,
                    fileData: fileData || null,
                    replyTo: replyTo || null,
                    reactions: {},
                    timestamp: new Date(),
                    read: false
                };
                
                // Сохраняем сообщение
                if (!messages.has(chatId)) {
                    messages.set(chatId, []);
                }
                messages.get(chatId).push(message);
                
                // Отправляем всем участникам чата
                io.to(chatId).emit('new-message', { chatId, message });
            }
        } catch (error) {
            console.error('Ошибка отправки сообщения:', error);
            socket.emit('message-error', { error: 'Ошибка отправки сообщения' });
        }
    });
    
    // ИМБОВЫЕ РЕАКЦИИ НА СООБЩЕНИЯ
    socket.on('add-reaction', async (data) => {
        const { messageId, emoji, chatId } = data;
        
        if (!socket.userId) return;
        
        try {
            if (useDatabase) {
                const message = await Message.findByPk(messageId);
                if (!message) return;
                
                let reactions = message.fileData?.reactions || {};
                if (!reactions[emoji]) {
                    reactions[emoji] = [];
                }
                
                if (!reactions[emoji].includes(socket.userId)) {
                    reactions[emoji].push(socket.userId);
                }
                
                // Обновляем сообщение
                const updatedFileData = { ...message.fileData, reactions };
                await message.update({ fileData: updatedFileData });
                
                // Уведомляем всех участников
                io.to(chatId).emit('reaction-added', {
                    messageId,
                    emoji,
                    userId: socket.userId,
                    reactions
                });
            } else {
                // Fallback для Map
                const chatMessages = messages.get(chatId) || [];
                const message = chatMessages.find(m => m.id === messageId);
                
                if (message) {
                    if (!message.reactions) message.reactions = {};
                    if (!message.reactions[emoji]) message.reactions[emoji] = [];
                    
                    if (!message.reactions[emoji].includes(socket.userId)) {
                        message.reactions[emoji].push(socket.userId);
                    }
                    
                    io.to(chatId).emit('reaction-added', {
                        messageId,
                        emoji,
                        userId: socket.userId,
                        reactions: message.reactions
                    });
                }
            }
        } catch (error) {
            console.error('Ошибка добавления реакции:', error);
        }
    });
    
    socket.on('toggle-reaction', async (data) => {
        const { messageId, emoji, chatId } = data;
        
        if (!socket.userId) return;
        
        try {
            if (useDatabase) {
                const message = await Message.findByPk(messageId);
                if (!message) return;
                
                let reactions = message.fileData?.reactions || {};
                if (!reactions[emoji]) {
                    reactions[emoji] = [];
                }
                
                const userIndex = reactions[emoji].indexOf(socket.userId);
                if (userIndex > -1) {
                    reactions[emoji].splice(userIndex, 1);
                    if (reactions[emoji].length === 0) {
                        delete reactions[emoji];
                    }
                } else {
                    reactions[emoji].push(socket.userId);
                }
                
                const updatedFileData = { ...message.fileData, reactions };
                await message.update({ fileData: updatedFileData });
                
                io.to(chatId).emit('reaction-toggled', {
                    messageId,
                    emoji,
                    userId: socket.userId,
                    reactions
                });
            } else {
                const chatMessages = messages.get(chatId) || [];
                const message = chatMessages.find(m => m.id === messageId);
                
                if (message) {
                    if (!message.reactions) message.reactions = {};
                    if (!message.reactions[emoji]) message.reactions[emoji] = [];
                    
                    const userIndex = message.reactions[emoji].indexOf(socket.userId);
                    if (userIndex > -1) {
                        message.reactions[emoji].splice(userIndex, 1);
                        if (message.reactions[emoji].length === 0) {
                            delete message.reactions[emoji];
                        }
                    } else {
                        message.reactions[emoji].push(socket.userId);
                    }
                    
                    io.to(chatId).emit('reaction-toggled', {
                        messageId,
                        emoji,
                        userId: socket.userId,
                        reactions: message.reactions
                    });
                }
            }
        } catch (error) {
            console.error('Ошибка переключения реакции:', error);
        }
    });
    
    // Создание чата
    socket.on('create-chat', async (otherUserId) => {
        if (!socket.userId) return;
        
        try {
            if (useDatabase) {
                // Используем PostgreSQL - упрощенный запрос
                // Ищем существующий чат между двумя пользователями
                const existingChatParticipants = await ChatParticipant.findAll({
                    where: {
                        userId: { [Op.in]: [socket.userId, otherUserId] }
                    },
                    include: [{ model: Chat }]
                });
                
                // Группируем по chatId и ищем чат с обоими участниками
                const chatCounts = {};
                existingChatParticipants.forEach(participant => {
                    const chatId = participant.chatId;
                    if (!chatCounts[chatId]) {
                        chatCounts[chatId] = { count: 0, chat: participant.Chat };
                    }
                    chatCounts[chatId].count++;
                });
                
                // Ищем чат с двумя участниками
                let existingChat = null;
                for (const chatId in chatCounts) {
                    if (chatCounts[chatId].count === 2) {
                        existingChat = chatCounts[chatId].chat;
                        break;
                    }
                }
                
                if (existingChat) {
                    socket.emit('chat-created', { chatId: existingChat.id });
                    return;
                }
                
                // Создаем новый чат
                const chat = await Chat.create({
                    type: 'private'
                });
                
                // Добавляем участников
                await ChatParticipant.bulkCreate([
                    { chatId: chat.id, userId: socket.userId },
                    { chatId: chat.id, userId: otherUserId }
                ]);
                
                // Уведомляем создателя
                socket.emit('chat-created', { chatId: chat.id });
                
                // Уведомляем другого пользователя о новом чате
                const otherUserSocketId = onlineUsers.get(otherUserId);
                if (otherUserSocketId) {
                    io.to(otherUserSocketId).emit('new-chat', { chatId: chat.id });
                }
            } else {
                // Используем Map (fallback)
                // Проверяем существование чата
                const existingChat = Array.from(chats.values()).find(chat =>
                    chat.participants.includes(socket.userId) && chat.participants.includes(otherUserId)
                );
                
                if (existingChat) {
                    socket.emit('chat-created', { chatId: existingChat.id });
                    return;
                }
                
                // Создаем новый чат
                const chatId = uuidv4();
                const chat = {
                    id: chatId,
                    participants: [socket.userId, otherUserId],
                    createdAt: new Date()
                };
                
                chats.set(chatId, chat);
                messages.set(chatId, []);
                
                // Уведомляем создателя
                socket.emit('chat-created', { chatId });
                
                // Уведомляем другого пользователя о новом чате
                const otherUserSocketId = onlineUsers.get(otherUserId);
                if (otherUserSocketId) {
                    io.to(otherUserSocketId).emit('new-chat', { chatId });
                }
            }
        } catch (error) {
            console.error('Ошибка создания чата:', error);
            socket.emit('chat-error', { error: 'Ошибка создания чата' });
        }
    });
    
    // Видеозвонки - улучшенная синхронизация
    socket.on('initiate-call', async (data) => {
        const { targetUserId, callType, chatId } = data;
        const targetSocketId = onlineUsers.get(targetUserId);
        
        if (targetSocketId) {
            const callId = uuidv4();
            let caller;
            
            try {
                if (useDatabase) {
                    caller = await User.findByPk(socket.userId);
                } else {
                    caller = users.get(socket.userId);
                }
            } catch (error) {
                console.error('Ошибка получения данных пользователя:', error);
                caller = { username: 'Неизвестный' };
            }
            
            io.to(targetSocketId).emit('incoming-call', {
                callId,
                fromUserId: socket.userId,
                fromUsername: caller ? caller.username : 'Неизвестный',
                callType,
                chatId
            });
        } else {
            socket.emit('call-failed', { error: 'Пользователь не в сети' });
        }
    });

    socket.on('accept-call', (data) => {
        const { callId, targetUserId } = data;
        const targetSocketId = onlineUsers.get(targetUserId);
        
        if (targetSocketId) {
            io.to(targetSocketId).emit('call-accepted', { callId });
        }
    });

    socket.on('reject-call', (data) => {
        const { callId, targetUserId } = data;
        const targetSocketId = onlineUsers.get(targetUserId);
        
        if (targetSocketId) {
            io.to(targetSocketId).emit('call-rejected', { callId });
        }
    });

    socket.on('end-call', (data) => {
        const { chatId } = data;
        // Уведомляем всех участников чата о завершении звонка
        socket.to(chatId).emit('call-ended', {});
    });

    // Старые обработчики видеозвонков (для совместимости)
    socket.on('create-room', (roomId) => {
        if (!rooms.has(roomId)) {
            rooms.set(roomId, {
                id: roomId,
                users: new Set(),
                created: Date.now()
            });
        }
        
        socket.join(roomId);
        rooms.get(roomId).users.add(socket.id);
        
        socket.emit('room-created', { roomId, userId: socket.id });
    });

    socket.on('join-room', (roomId) => {
        if (!rooms.has(roomId)) {
            socket.emit('error', 'Комната не найдена');
            return;
        }

        const room = rooms.get(roomId);
        socket.join(roomId);
        room.users.add(socket.id);

        socket.to(roomId).emit('user-joined', socket.id);
        
        socket.emit('room-joined', { 
            roomId, 
            userId: socket.id,
            users: Array.from(room.users)
        });
    });

    socket.on('signal', (data) => {
        const { roomId, signal, to } = data;
        
        if (to) {
            socket.to(to).emit('signal', {
                signal,
                from: socket.id
            });
        } else {
            socket.to(roomId).emit('signal', {
                signal,
                from: socket.id
            });
        }
    });
    
    // Обновление статуса пользователя
    socket.on('update-status', async (data) => {
        const { status, text } = data;
        
        if (!socket.userId) return;
        
        try {
            if (useDatabase) {
                const user = await User.findByPk(socket.userId);
                if (user) {
                    await user.update({ 
                        status: status,
                        statusText: text || null
                    });
                }
            } else {
                const user = users.get(socket.userId);
                if (user) {
                    user.status = status;
                    user.statusText = text || null;
                }
            }
            
            // Уведомляем всех о смене статуса
            socket.broadcast.emit('user-status-changed', {
                userId: socket.userId,
                status: status,
                statusText: text
            });
            
        } catch (error) {
            console.error('Ошибка обновления статуса:', error);
        }
    });
    
    // Голосование в опросах
    socket.on('vote-poll', async (data) => {
        const { messageId, optionIndex, chatId } = data;
        
        if (!socket.userId) return;
        
        try {
            if (useDatabase) {
                const message = await Message.findByPk(messageId);
                if (!message || message.type !== 'poll') return;
                
                let pollData = message.fileData || {};
                if (!pollData.votes) pollData.votes = {};
                if (!pollData.votes[optionIndex]) pollData.votes[optionIndex] = [];
                
                // Убираем предыдущие голоса пользователя если не множественный выбор
                if (!pollData.multiple) {
                    Object.keys(pollData.votes).forEach(key => {
                        pollData.votes[key] = pollData.votes[key].filter(userId => userId !== socket.userId);
                    });
                }
                
                // Добавляем или убираем голос
                const userVoteIndex = pollData.votes[optionIndex].indexOf(socket.userId);
                if (userVoteIndex > -1) {
                    pollData.votes[optionIndex].splice(userVoteIndex, 1);
                } else {
                    pollData.votes[optionIndex].push(socket.userId);
                }
                
                await message.update({ fileData: pollData });
                
                // Уведомляем всех участников
                io.to(chatId).emit('poll-updated', {
                    messageId,
                    pollData
                });
                
            } else {
                // Fallback для Map
                const chatMessages = messages.get(chatId) || [];
                const message = chatMessages.find(m => m.id === messageId);
                
                if (message && message.type === 'poll') {
                    if (!message.pollData.votes) message.pollData.votes = {};
                    if (!message.pollData.votes[optionIndex]) message.pollData.votes[optionIndex] = [];
                    
                    // Убираем предыдущие голоса если не множественный выбор
                    if (!message.pollData.multiple) {
                        Object.keys(message.pollData.votes).forEach(key => {
                            message.pollData.votes[key] = message.pollData.votes[key].filter(userId => userId !== socket.userId);
                        });
                    }
                    
                    // Добавляем или убираем голос
                    const userVoteIndex = message.pollData.votes[optionIndex].indexOf(socket.userId);
                    if (userVoteIndex > -1) {
                        message.pollData.votes[optionIndex].splice(userVoteIndex, 1);
                    } else {
                        message.pollData.votes[optionIndex].push(socket.userId);
                    }
                    
                    io.to(chatId).emit('poll-updated', {
                        messageId,
                        pollData: message.pollData
                    });
                }
            }
        } catch (error) {
            console.error('Ошибка голосования в опросе:', error);
        }
    });
    
    // Ход в игре
    socket.on('game-move', async (data) => {
        const { messageId, move, chatId } = data;
        
        if (!socket.userId) return;
        
        try {
            if (useDatabase) {
                const message = await Message.findByPk(messageId);
                if (!message || message.type !== 'game') return;
                
                let gameData = message.fileData || {};
                
                // Обрабатываем ход в зависимости от типа игры
                switch (gameData.type) {
                    case 'tic-tac-toe':
                        if (gameData.status === 'active' && gameData.board[move.position] === '') {
                            gameData.board[move.position] = gameData.currentPlayer;
                            gameData.currentPlayer = gameData.currentPlayer === 'X' ? 'O' : 'X';
                            
                            // Проверяем победу
                            const winner = this.checkTicTacToeWinner(gameData.board);
                            if (winner) {
                                gameData.status = 'finished';
                                gameData.winner = winner;
                            } else if (!gameData.board.includes('')) {
                                gameData.status = 'draw';
                            }
                        }
                        break;
                        
                    case 'word-game':
                        if (gameData.status === 'active' && move.letter) {
                            const letter = move.letter.toUpperCase();
                            if (!gameData.guessedLetters.includes(letter)) {
                                gameData.guessedLetters.push(letter);
                                
                                if (gameData.word.includes(letter)) {
                                    // Открываем буквы
                                    for (let i = 0; i < gameData.word.length; i++) {
                                        if (gameData.word[i] === letter) {
                                            gameData.guessed[i] = letter;
                                        }
                                    }
                                    
                                    // Проверяем победу
                                    if (!gameData.guessed.includes('_')) {
                                        gameData.status = 'won';
                                    }
                                } else {
                                    gameData.attempts--;
                                    if (gameData.attempts <= 0) {
                                        gameData.status = 'lost';
                                    }
                                }
                            }
                        }
                        break;
                }
                
                await message.update({ fileData: gameData });
                
                // Уведомляем всех участников
                io.to(chatId).emit('game-updated', {
                    messageId,
                    gameData
                });
                
            } else {
                // Fallback для Map - аналогичная логика
                const chatMessages = messages.get(chatId) || [];
                const message = chatMessages.find(m => m.id === messageId);
                
                if (message && message.type === 'game') {
                    // Аналогичная обработка для Map
                    io.to(chatId).emit('game-updated', {
                        messageId,
                        gameData: message.gameData
                    });
                }
            }
        } catch (error) {
            console.error('Ошибка хода в игре:', error);
        }
    });
    
    // Отключение
    socket.on('disconnect', async () => {
        console.log('Пользователь отключился:', socket.id);
        
        if (socket.userId) {
            // Удаляем из онлайн
            onlineUsers.delete(socket.userId);
            
            // Обновляем время последнего посещения
            try {
                if (useDatabase) {
                    const user = await User.findByPk(socket.userId);
                    if (user) {
                        await user.update({ lastSeen: new Date() });
                    }
                } else {
                    const user = users.get(socket.userId);
                    if (user) {
                        user.lastSeen = new Date();
                    }
                }
            } catch (error) {
                console.error('Ошибка обновления времени последнего посещения:', error);
            }
            
            // Уведомляем всех о статусе оффлайн
            socket.broadcast.emit('user-offline', socket.userId);
        }
        
        // Удаляем из комнат видеозвонков
        rooms.forEach((room, roomId) => {
            if (room.users.has(socket.id)) {
                room.users.delete(socket.id);
                socket.to(roomId).emit('user-left', socket.id);
                
                if (room.users.size === 0) {
                    rooms.delete(roomId);
                }
            }
        });
    });
});

// Обслуживание статических файлов
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Очистка старых комнат каждые 30 минут
setInterval(() => {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 часа
    
    rooms.forEach((room, roomId) => {
        if (now - room.created > maxAge && room.users.size === 0) {
            rooms.delete(roomId);
        }
    });
}, 30 * 60 * 1000);

// Вспомогательные функции для игр
function checkTicTacToeWinner(board) {
    const winPatterns = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8], // горизонтали
        [0, 3, 6], [1, 4, 7], [2, 5, 8], // вертикали
        [0, 4, 8], [2, 4, 6] // диагонали
    ];
    
    for (const pattern of winPatterns) {
        const [a, b, c] = pattern;
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            return board[a];
        }
    }
    
    return null;
}

// Запуск сервера с инициализацией базы данных
async function startServer() {
    try {
        // Пытаемся инициализировать базу данных
        useDatabase = await initDatabase();
        
        if (useDatabase) {
            console.log('✅ Используем PostgreSQL базу данных');
        } else {
            console.log('⚠️  Используем временное хранилище в памяти');
            console.log('⚠️  Данные будут потеряны при перезагрузке сервера');
        }
        
        // Запускаем сервер
        server.listen(PORT, () => {
            console.log(`🚀 Flux Messenger запущен на порту ${PORT}`);
            console.log(`📊 База данных: ${useDatabase ? 'PostgreSQL' : 'Memory (fallback)'}`);
            console.log(`🌐 Режим: ${process.env.NODE_ENV || 'development'}`);
        });
        
    } catch (error) {
        console.error('❌ Ошибка запуска сервера:', error);
        process.exit(1);
    }
}

// Запускаем сервер
startServer();