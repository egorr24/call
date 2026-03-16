const jwt = require('jsonwebtoken');
const { pool } = require('../database/init');

// Middleware для HTTP запросов
const authenticateToken = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'Токен не предоставлен' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const result = await pool.query(
      'SELECT id, username, email FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Пользователь не найден' });
    }

    req.user = result.rows[0];
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ message: 'Недействительный токен' });
  }
};

// Middleware для Socket.io
const authenticateSocket = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      return next(new Error('Токен не предоставлен'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const result = await pool.query(
      'SELECT id, username, email FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return next(new Error('Пользователь не найден'));
    }

    socket.userId = result.rows[0].id;
    socket.username = result.rows[0].username;
    next();
  } catch (error) {
    console.error('Socket auth error:', error);
    next(new Error('Недействительный токен'));
  }
};

module.exports = { authenticateToken, authenticateSocket };