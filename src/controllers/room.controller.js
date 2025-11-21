const pool = require('../config/database');
const { v4: uuidv4 } = require('uuid');

const generateBurnerUsername = () => {
  const adjectives = ['Blue', 'Red', 'Green', 'Golden', 'Silver', 'Crimson', 'Azure', 'Violet'];
  const nouns = ['Lion', 'Eagle', 'Wolf', 'Tiger', 'Phoenix', 'Dragon', 'Falcon', 'Bear'];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(Math.random() * 999) + 1;
  return `${adj}${noun}#${num}`;
};

exports.createRoom = async (req, res) => {
  try {
    const { name, roomType, duration } = req.body;
    
    const qrCode = uuidv4();
    const expiresAt = new Date(Date.now() + (duration || 24) * 60 * 60 * 1000);

    const result = await pool.query(
      'INSERT INTO qr_rooms (creator_id, name, qr_code, room_type, expires_at) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [req.userId, name, qrCode, roomType, expiresAt]
    );

    const room = result.rows[0];
    const burnerUsername = generateBurnerUsername();

    await pool.query(
      'INSERT INTO room_members (room_id, user_id, burner_username) VALUES ($1, $2, $3)',
      [room.room_id, req.userId, burnerUsername]
    );

    res.json({ room, burnerUsername });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create room' });
  }
};

exports.getRooms = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT r.room_id, r.name, r.room_type, r.expires_at, r.created_at,
             COUNT(rm.user_id) as member_count
      FROM qr_rooms r
      LEFT JOIN room_members rm ON r.room_id = rm.room_id
      WHERE r.expires_at > NOW()
      GROUP BY r.room_id
      ORDER BY r.created_at DESC
    `);

    res.json({ rooms: result.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch rooms' });
  }
};

exports.joinRoom = async (req, res) => {
  try {
    const { qrCode } = req.body;

    const roomResult = await pool.query(
      'SELECT * FROM qr_rooms WHERE qr_code = $1 AND expires_at > NOW()',
      [qrCode]
    );

    if (roomResult.rows.length === 0) {
      return res.status(404).json({ error: 'Room not found or expired' });
    }

    const room = roomResult.rows[0];
    const burnerUsername = generateBurnerUsername();

    await pool.query(
      'INSERT INTO room_members (room_id, user_id, burner_username) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
      [room.room_id, req.userId, burnerUsername]
    );

    res.json({ room, burnerUsername });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to join room' });
  }
};

exports.leaveRoom = async (req, res) => {
  try {
    const { roomId } = req.body;

    await pool.query(
      'DELETE FROM room_members WHERE room_id = $1 AND user_id = $2',
      [roomId, req.userId]
    );

    res.json({ message: 'Left room' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to leave room' });
  }
};
