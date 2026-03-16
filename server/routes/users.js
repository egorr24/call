const express = require('express');
const { pool } = require('../database/init');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Поиск пользователей
router.get('/search', authenticateToken, async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.length < 2) {
      return res.json([]);
    }

    const result = await pool.query(`
      SELECT id, username, email, avatar_url, status
      FROM users 
      WHERE (username ILIKE $1 OR email ILIKE $1) 
      AND id != $2
      LIMIT 20
    `, [`%${q}%`, req.user.id]);

    res.json(result.rows);
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({ message: 'Ошибка поиска пользователей' });
  }
});

// Получить профиль пользователя
router.get('/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;

    const result = await pool.query(
      'SELECT id, username, email, avatar_url, status, last_seen FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Ошибка получения пользователя' });
  }
});

// Обновить профиль
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { username, avatar_url } = req.body;

    const result = await pool.query(
      'UPDATE users SET username = $1, avatar_url = $2 WHERE id = $3 RETURNING id, username, email, avatar_url',
      [username, avatar_url, req.user.id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Ошибка обновления профиля' });
  }
});

// Обновить статус пользователя
router.put('/status', authenticateToken, async (req, res) => {
  try {
    const { status } = req.body;

    await pool.query(
      'UPDATE users SET status = $1, last_seen = NOW() WHERE id = $2',
      [status, req.user.id]
    );

    res.json({ message: 'Статус обновлен' });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ message: 'Ошибка обновления статуса' });
  }
});

module.exports = router;