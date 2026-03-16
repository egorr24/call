const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const chatRoutes = require('./routes/chat');
const userRoutes = require('./routes/users');
const { initDatabase } = require('./database/init');
const { authenticateSocket } = require('./middleware/auth');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL || "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../client/build')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/users', userRoutes);

// Socket.io для чатов и видеозвонков
const connectedUsers = new Map();
const activeRooms = new Map();

io.use(authenticateSocket);

io.on('connection', (socket) => {
  console.log('User connected:', socket.userId);
  
  // Сохраняем пользователя
  connectedUsers.set(socket.userId, {
    socketId: socket.id,
    userId: socket.userId,
    username: socket.username
  });

  // Присоединение к чату
  socket.on('join-chat', (chatId) => {
    socket.join(chatId);
    console.log(`User ${socket.userId} joined chat ${chatId}`);
  });

  // Отправка сообщения
  socket.on('send-message', async (data) => {
    try {
      // Сохранение в БД
      const message = await saveMessage(data);
      
      // Отправка всем в чате
      io.to(data.chatId).emit('new-message', message);
    } catch (error) {
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

  // WebRTC сигналинг для видеозвонков
  socket.on('call-user', (data) => {
    const targetUser = connectedUsers.get(data.targetUserId);
    if (targetUser) {
      io.to(targetUser.socketId).emit('incoming-call', {
        from: socket.userId,
        fromUsername: socket.username,
        signal: data.signal,
        callId: data.callId
      });
    }
  });

  socket.on('answer-call', (data) => {
    const targetUser = connectedUsers.get(data.targetUserId);
    if (targetUser) {
      io.to(targetUser.socketId).emit('call-answered', {
        signal: data.signal,
        callId: data.callId
      });
    }
  });

  socket.on('ice-candidate', (data) => {
    const targetUser = connectedUsers.get(data.targetUserId);
    if (targetUser) {
      io.to(targetUser.socketId).emit('ice-candidate', {
        candidate: data.candidate,
        callId: data.callId
      });
    }
  });

  socket.on('end-call', (data) => {
    const targetUser = connectedUsers.get(data.targetUserId);
    if (targetUser) {
      io.to(targetUser.socketId).emit('call-ended', {
        callId: data.callId
      });
    }
  });

  // Отключение
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.userId);
    connectedUsers.delete(socket.userId);
  });
});

// Serve React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/build/index.html'));
});

// Инициализация БД и запуск сервера
async function startServer() {
  try {
    await initDatabase();
    server.listen(PORT, () => {
      console.log(`Flux Messenger server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

// Функция сохранения сообщения
async function saveMessage(data) {
  const { Pool } = require('pg');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  const result = await pool.query(
    'INSERT INTO messages (chat_id, sender_id, content, message_type, created_at) VALUES ($1, $2, $3, $4, NOW()) RETURNING *',
    [data.chatId, data.senderId, data.content, data.messageType || 'text']
  );
  
  return result.rows[0];
}