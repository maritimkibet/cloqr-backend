const pool = require('../config/database');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;

exports.getChats = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT c.chat_id, c.type, c.name, c.expires_at, c.created_at,
             json_agg(json_build_object('user_id', u.user_id, 'username', u.username, 'avatar_url', u.avatar_url)) as members
      FROM chats c
      JOIN chat_members cm ON c.chat_id = cm.chat_id
      JOIN users u ON cm.user_id = u.user_id
      WHERE c.chat_id IN (SELECT chat_id FROM chat_members WHERE user_id = $1)
      GROUP BY c.chat_id
      ORDER BY c.created_at DESC
    `, [req.userId]);

    res.json({ chats: result.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch chats' });
  }
};

exports.createChat = async (req, res) => {
  try {
    const { type, name, members } = req.body;
    const expiresAt = new Date(new Date().setHours(24, 0, 0, 0));

    const chatResult = await pool.query(
      'INSERT INTO chats (type, name, created_by, expires_at) VALUES ($1, $2, $3, $4) RETURNING chat_id',
      [type, name, req.userId, expiresAt]
    );

    const chatId = chatResult.rows[0].chat_id;

    const allMembers = [req.userId, ...members];
    for (const memberId of allMembers) {
      await pool.query(
        'INSERT INTO chat_members (chat_id, user_id) VALUES ($1, $2)',
        [chatId, memberId]
      );
    }

    res.json({ chatId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create chat' });
  }
};

exports.getMessages = async (req, res) => {
  try {
    const { chatId } = req.params;

    const isMember = await pool.query(
      'SELECT * FROM chat_members WHERE chat_id = $1 AND user_id = $2',
      [chatId, req.userId]
    );

    if (isMember.rows.length === 0) {
      return res.status(403).json({ error: 'Not a member of this chat' });
    }

    const result = await pool.query(`
      SELECT m.message_id, m.content, m.type, m.is_one_time, m.viewed_by, m.expires_at, m.created_at,
             u.user_id, u.username, u.avatar_url
      FROM messages m
      JOIN users u ON m.sender_id = u.user_id
      WHERE m.chat_id = $1 AND m.expires_at > NOW()
      ORDER BY m.created_at ASC
    `, [chatId]);

    res.json({ messages: result.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
};

exports.sendMessage = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { content, type, isOneTime } = req.body;

    const expiresAt = new Date(new Date().setHours(24, 0, 0, 0));

    const result = await pool.query(
      'INSERT INTO messages (chat_id, sender_id, content, type, is_one_time, expires_at) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [chatId, req.userId, content, type || 'text', isOneTime || false, expiresAt]
    );

    res.json({ message: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to send message' });
  }
};

exports.sendPhoto = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { isOneTime } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const filename = `photo_${Date.now()}.jpg`;
    const outputPath = path.join('uploads', filename);

    await sharp(req.file.path)
      .resize(800, 800, { fit: 'inside' })
      .toFile(outputPath);

    await fs.unlink(req.file.path);

    const photoUrl = `/uploads/${filename}`;
    const expiresAt = new Date(new Date().setHours(24, 0, 0, 0));

    const result = await pool.query(
      'INSERT INTO messages (chat_id, sender_id, content, type, is_one_time, expires_at) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [chatId, req.userId, photoUrl, 'photo', isOneTime === 'true', expiresAt]
    );

    res.json({ message: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to send photo' });
  }
};

exports.reportScreenshot = async (req, res) => {
  try {
    const { chatId } = req.params;
    
    res.json({ message: 'Screenshot reported' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to report screenshot' });
  }
};
