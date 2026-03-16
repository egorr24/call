import jwt from 'jsonwebtoken'
import pool from '../config/database.js'

export const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]

  if (!token) {
    return res.status(401).json({ message: 'Access token required' })
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const result = await pool.query('SELECT id, username, email FROM users WHERE id = $1', [decoded.userId])
    
    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'User not found' })
    }

    req.user = result.rows[0]
    next()
  } catch (error) {
    return res.status(403).json({ message: 'Invalid token' })
  }
}

export const authenticateSocket = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token
    
    if (!token) {
      return next(new Error('Authentication error'))
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const result = await pool.query('SELECT id, username, email FROM users WHERE id = $1', [decoded.userId])
    
    if (result.rows.length === 0) {
      return next(new Error('User not found'))
    }

    socket.userId = result.rows[0].id
    socket.user = result.rows[0]
    next()
  } catch (error) {
    next(new Error('Authentication error'))
  }
}