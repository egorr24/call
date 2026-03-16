import pool from '../config/database.js'

export const handleSocketConnection = (socket, io) => {
  // Join user to their personal room
  socket.join(`user_${socket.userId}`)

  // Join user to their chat rooms
  socket.on('joinChats', async () => {
    try {
      const result = await pool.query(
        'SELECT chat_id FROM chat_participants WHERE user_id = $1',
        [socket.userId]
      )
      
      result.rows.forEach(row => {
        socket.join(`chat_${row.chat_id}`)
      })
    } catch (error) {
      console.error('Join chats error:', error)
    }
  })

  // Handle sending messages
  socket.on('sendMessage', async (data) => {
    try {
      const { chatId, content, type = 'text' } = data

      // Verify user is participant
      const participantCheck = await pool.query(
        'SELECT 1 FROM chat_participants WHERE chat_id = $1 AND user_id = $2',
        [chatId, socket.userId]
      )

      if (participantCheck.rows.length === 0) {
        socket.emit('error', { message: 'Access denied' })
        return
      }

      // Save message to database
      const result = await pool.query(`
        INSERT INTO messages (chat_id, sender_id, content, type, created_at)
        VALUES ($1, $2, $3, $4, NOW())
        RETURNING id, chat_id, sender_id, content, type, created_at as timestamp
      `, [chatId, socket.userId, content, type])

      const message = result.rows[0]

      // Update chat's updated_at
      await pool.query(
        'UPDATE chats SET updated_at = NOW() WHERE id = $1',
        [chatId]
      )

      // Emit to all participants in the chat
      io.to(`chat_${chatId}`).emit('newMessage', {
        ...message,
        senderName: socket.user.username
      })

    } catch (error) {
      console.error('Send message error:', error)
      socket.emit('error', { message: 'Failed to send message' })
    }
  })

  // Handle typing indicators
  socket.on('typing', (data) => {
    const { chatId, isTyping } = data
    socket.to(`chat_${chatId}`).emit('userTyping', {
      userId: socket.userId,
      username: socket.user.username,
      isTyping
    })
  })

  // Handle video call signaling
  socket.on('callUser', (data) => {
    const { targetUserId, offer, chatId } = data
    io.to(`user_${targetUserId}`).emit('incomingCall', {
      from: socket.userId,
      fromName: socket.user.username,
      offer,
      chatId
    })
  })

  socket.on('answerCall', (data) => {
    const { targetUserId, answer } = data
    io.to(`user_${targetUserId}`).emit('callAnswered', {
      answer,
      from: socket.userId
    })
  })

  socket.on('iceCandidate', (data) => {
    const { targetUserId, candidate } = data
    io.to(`user_${targetUserId}`).emit('iceCandidate', {
      candidate,
      from: socket.userId
    })
  })

  socket.on('endCall', (data) => {
    const { targetUserId } = data
    io.to(`user_${targetUserId}`).emit('callEnded', {
      from: socket.userId
    })
  })

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.userId}`)
  })
}