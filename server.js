const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Хранилище комнат в памяти
const rooms = new Map();

// Обслуживание статических файлов
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// WebSocket соединения
io.on('connection', (socket) => {
    console.log('Пользователь подключился:', socket.id);

    // Создание комнаты
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
        console.log(`Комната ${roomId} создана пользователем ${socket.id}`);
    });

    // Присоединение к комнате
    socket.on('join-room', (roomId) => {
        if (!rooms.has(roomId)) {
            socket.emit('error', 'Комната не найдена');
            return;
        }

        const room = rooms.get(roomId);
        socket.join(roomId);
        room.users.add(socket.id);

        // Уведомляем других пользователей в комнате
        socket.to(roomId).emit('user-joined', socket.id);
        
        // Отправляем подтверждение присоединения
        socket.emit('room-joined', { 
            roomId, 
            userId: socket.id,
            users: Array.from(room.users)
        });

        console.log(`Пользователь ${socket.id} присоединился к комнате ${roomId}`);
    });

    // Обмен сигналами WebRTC
    socket.on('signal', (data) => {
        const { roomId, signal, to } = data;
        
        if (to) {
            // Отправляем конкретному пользователю
            socket.to(to).emit('signal', {
                signal,
                from: socket.id
            });
        } else {
            // Отправляем всем в комнате кроме отправителя
            socket.to(roomId).emit('signal', {
                signal,
                from: socket.id
            });
        }
    });

    // Отключение пользователя
    socket.on('disconnect', () => {
        console.log('Пользователь отключился:', socket.id);
        
        // Удаляем пользователя из всех комнат
        rooms.forEach((room, roomId) => {
            if (room.users.has(socket.id)) {
                room.users.delete(socket.id);
                
                // Уведомляем других пользователей
                socket.to(roomId).emit('user-left', socket.id);
                
                // Удаляем пустые комнаты
                if (room.users.size === 0) {
                    rooms.delete(roomId);
                    console.log(`Комната ${roomId} удалена`);
                }
            }
        });
    });

    // Выход из комнаты
    socket.on('leave-room', (roomId) => {
        if (rooms.has(roomId)) {
            const room = rooms.get(roomId);
            room.users.delete(socket.id);
            
            socket.to(roomId).emit('user-left', socket.id);
            socket.leave(roomId);
            
            if (room.users.size === 0) {
                rooms.delete(roomId);
            }
        }
    });
});

// Очистка старых комнат каждые 30 минут
setInterval(() => {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 часа
    
    rooms.forEach((room, roomId) => {
        if (now - room.created > maxAge && room.users.size === 0) {
            rooms.delete(roomId);
            console.log(`Удалена старая комната: ${roomId}`);
        }
    });
}, 30 * 60 * 1000);

server.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
});