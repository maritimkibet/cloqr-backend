const jwt = require('jsonwebtoken');
const pool = require('../config/database');

const initializeSocket = (io) => {
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication error'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.userId;
      next();
    } catch (err) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.userId}`);

    socket.on('join_chat', async (chatId) => {
      const isMember = await pool.query(
        'SELECT * FROM chat_members WHERE chat_id = $1 AND user_id = $2',
        [chatId, socket.userId]
      );

      if (isMember.rows.length > 0) {
        socket.join(chatId);
        console.log(`User ${socket.userId} joined chat ${chatId}`);
      }
    });

    socket.on('send_message', async (data) => {
      const { chatId, content, type, isOneTime } = data;
      
      const expiresAt = new Date(new Date().setHours(24, 0, 0, 0));

      const result = await pool.query(
        'INSERT INTO messages (chat_id, sender_id, content, type, is_one_time, expires_at) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
        [chatId, socket.userId, content, type || 'text', isOneTime || false, expiresAt]
      );

      const message = result.rows[0];

      const userResult = await pool.query(
        'SELECT user_id, username, avatar_url FROM users WHERE user_id = $1',
        [socket.userId]
      );

      const messageData = {
        ...message,
        user: userResult.rows[0]
      };

      io.to(chatId).emit('new_message', messageData);
    });

    socket.on('typing', (chatId) => {
      socket.to(chatId).emit('user_typing', { userId: socket.userId });
    });

    socket.on('screenshot_detected', async (data) => {
      const { chatId } = data;
      
      io.to(chatId).emit('screenshot_alert', {
        userId: socket.userId,
        timestamp: new Date()
      });
    });

    socket.on('join_room', async (roomId) => {
      socket.join(`room_${roomId}`);
      console.log(`User ${socket.userId} joined room ${roomId}`);
    });

    socket.on('room_message', async (data) => {
      const { roomId, content } = data;

      const memberResult = await pool.query(
        'SELECT burner_username FROM room_members WHERE room_id = $1 AND user_id = $2',
        [roomId, socket.userId]
      );

      if (memberResult.rows.length > 0) {
        const burnerUsername = memberResult.rows[0].burner_username;

        io.to(`room_${roomId}`).emit('room_message', {
          username: burnerUsername,
          content,
          timestamp: new Date()
        });
      }
    });

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.userId}`);
    });
  });
};

module.exports = { initializeSocket };
