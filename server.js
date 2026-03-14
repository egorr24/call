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

// Настройка multer для загрузки файлов
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        // Очищаем имя файла от специальных символов
        const cleanName = file.originalname
            .replace(/[^a-zA-Z0-9.-]/g, '_') // Заменяем спецсимволы на _
            .replace(/_{2,}/g, '_') // Убираем множественные _
            .toLowerCase();
        
        const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}-${cleanName}`;
        cb(null, uniqueName);
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

// Раздача загруженных файлов с правильной обработкой
app.use('/uploads', express.static(uploadsDir, {
    setHeaders: (res, path) => {
        // Устанавливаем правильные заголовки для разных типов файлов
        if (path.endsWith('.jpg') || path.endsWith('.jpeg')) {
            res.setHeader('Content-Type', 'image/jpeg');
        } else if (path.endsWith('.png')) {
            res.setHeader('Content-Type', 'image/png');
        } else if (path.endsWith('.gif')) {
            res.setHeader('Content-Type', 'image/gif');
        } else if (path.endsWith('.mp4')) {
            res.setHeader('Content-Type', 'video/mp4');
        } else if (path.endsWith('.pdf')) {
            res.setHeader('Content-Type', 'application/pdf');
        }
        
        // Кэширование файлов
        res.setHeader('Cache-Control', 'public, max-age=86400'); // 24 часа
    }
}));

// Обработка ошибок для несуществующих файлов
app.use('/uploads', (req, res, next) => {
    res.status(404).json({ error: 'Файл не найден' });
});

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
                online: onlineUsers.has(user.id),
                lastSeen: user.lastSeen
            }));
            
            res.json(userList);
        } else {
            // Используем Map (fallback)
            const userList = Array.from(users.values()).map(user => ({
                id: user.id,
                username: user.username,
                avatar: user.avatar,
                online: onlineUsers.has(user.id),
                lastSeen: user.lastSeen
            })).filter(user => user.id !== req.userId);
            
            res.json(userList);
        }
    } catch (error) {
        console.error('Ошибка получения пользователей:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
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
                    user: {
                        id: otherParticipant.User.id,
                        username: otherParticipant.User.username,
                        avatar: otherParticipant.User.avatar,
                        online: onlineUsers.has(otherParticipant.User.id)
                    },
                    lastMessage: lastMessage ? {
                        text: lastMessage.text,
                        timestamp: lastMessage.createdAt,
                        sender: lastMessage.senderId
                    } : null,
                    unreadCount: 0 // TODO: Implement unread count
                });
            }
            
            res.json(chatList);
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
                    user: {
                        id: otherUser.id,
                        username: otherUser.username,
                        avatar: otherUser.avatar,
                        online: onlineUsers.has(otherUser.id)
                    },
                    lastMessage: lastMessage ? {
                        text: lastMessage.text,
                        timestamp: lastMessage.timestamp,
                        sender: lastMessage.sender
                    } : null,
                    unreadCount: chatMessages.filter(msg => 
                        msg.sender !== req.userId && !msg.read
                    ).length
                };
            });
            
            res.json(userChats);
        }
    } catch (error) {
        console.error('Ошибка получения чатов:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
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
            
            res.json(formattedMessages);
        } else {
            // Используем Map (fallback)
            const chat = chats.get(chatId);
            
            if (!chat || !chat.participants.includes(req.userId)) {
                return res.status(403).json({ error: 'Доступ запрещен' });
            }
            
            const chatMessages = messages.get(chatId) || [];
            res.json(chatMessages);
        }
    } catch (error) {
        console.error('Ошибка получения сообщений:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
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
        const { chatId, text, type = 'text', fileData } = data;
        
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