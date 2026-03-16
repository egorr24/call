import express from 'express'
import pool from '../config/database.js'
import { authenticateToken } from '../middleware/auth.js'

const router = express.Router()

// Get user's chats
router.get('/chats', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        c.id,
        c.name,
        c.type,
        c.created_at,
        (
          SELECT json_build_object(
            'id', m.id,
            'content', m.content,
            'timestamp', m.created_at,
            'sender_id', m.sender_id
          )
          FROM messages m 
          WHERE m.chat_id = c.id 
          ORDER BY m.created_at DESC 
          LIMIT 1
        ) as last_message,
        (
          SELECT COUNT(*)::int
          FROM messages m
          WHERE m.chat_id = c.id 
          AND m.sender_id != $1
          AND m.read_at IS NULL
        ) as unread_count
      FROM chats c
      JOIN chat_participants cp ON c.id = cp.chat_id
      WHERE cp.user_id = $1
      ORDER BY c.updated_at DESC
    `, [req.user.id])

    res.json({ chats: result.rows })
  } catch (error) {
    console.error('Get chats error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// Get chat messages
router.get('/chats/:chatId/messages', authenticateToken, async (req, res) => {
  try {
    const { chatId } = req.params
    const { page = 1, limit = 50 } = req.query

    // Check if user is participant
    const participantCheck = await pool.query(
      'SELECT 1 FROM chat_participants WHERE chat_id = $1 AND user_id = $2',
      [chatId, req.user.id]
    )

    if (participantCheck.rows.length === 0) {
      return res.status(403).json({ message: 'Access denied' })
    }

    const offset = (page - 1) * limit

    const result = await pool.query(`
      SELECT 
        m.id,
        m.content,
        m.type,
        m.created_at as timestamp,
        m.sender_id,
        u.username as sender_name
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.chat_id = $1
      ORDER BY m.created_at DESC
      LIMIT $2 OFFSET $3
    `, [chatId, limit, offset])

    res.json({ messages: result.rows.reverse() })
  } catch (error) {
    console.error('Get messages error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// Create new chat
router.post('/chats', authenticateToken, async (req, res) => {
  try {
    const { name, type = 'private', participants = [] } = req.body

    if (!name) {
      return res.status(400).json({ message: 'Chat name is required' })
    }

    // Start transaction
    const client = await pool.connect()
    
    try {
      await client.query('BEGIN')

      // Create chat
      const chatResult = await client.query(
        'INSERT INTO chats (name, type, created_by, created_at, updated_at) VALUES ($1, $2, $3, NOW(), NOW()) RETURNING id',
        [name, type, req.user.id]
      )

      const chatId = chatResult.rows[0].id

      // Add creator as participant
      await client.query(
        'INSERT INTO chat_participants (chat_id, user_id, joined_at) VALUES ($1, $2, NOW())',
        [chatId, req.user.id]
      )

      // Add other participants
      for (const participantId of participants) {
        await client.query(
          'INSERT INTO chat_participants (chat_id, user_id, joined_at) VALUES ($1, $2, NOW())',
          [chatId, participantId]
        )
      }

      await client.query('COMMIT')

      res.status(201).json({ 
        message: 'Chat created successfully',
        chatId 
      })
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('Create chat error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

export default router