const pool = require('../config/database');

const cleanupExpiredData = async () => {
  try {
    await pool.query('DELETE FROM messages WHERE expires_at < NOW()');
    await pool.query('DELETE FROM chats WHERE expires_at < NOW()');
    await pool.query('DELETE FROM qr_rooms WHERE expires_at < NOW()');
    await pool.query('DELETE FROM otps WHERE expires_at < NOW()');
    
    console.log('✅ Cleanup completed');
  } catch (error) {
    console.error('❌ Cleanup error:', error);
  }
};

setInterval(cleanupExpiredData, 60 * 60 * 1000);

module.exports = { cleanupExpiredData };
