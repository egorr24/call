const express = require('express');
const { pool } = require('../database/init');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Получить все чаты пользователя
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        c.id,
        c.name,
        c.type,
        c.avatar_url,
        c.created_at,
        (
          SELECT content 
          FROM messages 
          WHERE chat_id = c.id 
          ORDER BY created_at DESC 
          LIMIT 1
        ) as last_message,
        (
          SELECT created_at 
          FROM messages 
          WHERE chat_id = c.id 
          ORDER BY created_at DESC 
          LIMIT 1
        ) as last_message_time,
        (
          SELECT COUNT(*) 
          FROM messages m 
          WHERE m.chat_id = c.id 
          AND m.sender_id != $1
          AND m.created_at > COALESCE(
            (SELECT last_read FROM chat_participants WHERE chat_id = c.id AND user_id = $1),
            '1970-01-01'
          )
        ) as unread_count
      FROM chats c
      JOIN chat_participants cp ON c.id = cp.chat_id
      WHERE cp.user_id = $1
      ORDER BY last_message_time DESC NULLS LAST
    `, [req.user.id]);

    res.json(result.rows);
  } catch (error) {
    console.error('Get chats error:', error);
    res.status(500).json({ message: 'Ошибка получения чатов' });
  }
});

// Получить сообщения чата
router.get('/:chatId/messages', authenticateToken, async (req, res) => {
  try {
    const { chatId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    // Проверить доступ к чату
    const accessCheck = await pool.query(
      'SELECT 1 FROM chat_participants WHERE chat_id = $1 AND user_id = $2',
      [chatId, req.user.id]
    );

    if (accessCheck.rows.length === 0) {
      return res.status(403).json({ message: 'Нет доступа к чату' });
    }

    const result = await pool.query(`
      SELECT 
        m.*,
        u.username as sender_username,
        u.avatar_url as sender_avatar
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.chat_id = $1
      ORDER BY m.created_at DESC
      LIMIT $2 OFFSET $3
    `, [chatId, limit, offset]);

    res.json(result.rows.reverse());
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ message: 'Ошибка получения сообщений' });
  }
});

// Создать новый чат
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, type = 'private', participantIds } = req.body;

    // Создать чат
    const chatResult = await pool.query(
      'INSERT INTO chats (name, type, created_by) VALUES ($1, $2, $3) RETURNING *',
      [name, type, req.user.id]
    );

    const chat = chatResult.rows[0];

    // Добавить создателя как участника
    await pool.query(
      'INSERT INTO chat_participants (chat_id, user_id, role) VALUES ($1, $2, $3)',
      [chat.id, req.user.id, 'admin']
    );

    // Добавить других участников
    if (participantIds && participantIds.length > 0) {
      for (const userId of participantIds) {
        await pool.query(
          'INSERT INTO chat_participants (chat_id, user_id) VALUES ($1, $2)',
          [chat.id, userId]
        );
      }
    }

    res.status(201).json(chat);
  } catch (error) {
    console.error('Create chat error:', error);
    res.status(500).json({ message: 'Ошибка создания чата' });
  }
});

module.exports = router;