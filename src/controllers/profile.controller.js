const pool = require('../config/database');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;

exports.getProfile = async (req, res) => {
  try {
    const userResult = await pool.query('SELECT * FROM users WHERE user_id = $1', [req.userId]);
    const profileResult = await pool.query('SELECT * FROM profiles WHERE user_id = $1', [req.userId]);

    const user = userResult.rows[0];
    const profile = profileResult.rows[0];

    res.json({ user, profile });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { year, course, bio, interests, study_style, study_time, hobbies, personality, mode } = req.body;

    await pool.query('UPDATE users SET mode = $1, updated_at = NOW() WHERE user_id = $2', [mode, req.userId]);

    const profileExists = await pool.query('SELECT * FROM profiles WHERE user_id = $1', [req.userId]);

    if (profileExists.rows.length === 0) {
      await pool.query(
        'INSERT INTO profiles (user_id, year, course, bio, interests, study_style, study_time, hobbies, personality) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
        [req.userId, year, course, bio, JSON.stringify(interests), study_style, study_time, JSON.stringify(hobbies), JSON.stringify(personality)]
      );
    } else {
      await pool.query(
        'UPDATE profiles SET year = $1, course = $2, bio = $3, interests = $4, study_style = $5, study_time = $6, hobbies = $7, personality = $8, updated_at = NOW() WHERE user_id = $9',
        [year, course, bio, JSON.stringify(interests), study_style, study_time, JSON.stringify(hobbies), JSON.stringify(personality), req.userId]
      );
    }

    res.json({ message: 'Profile updated' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
};

exports.selectAvatar = async (req, res) => {
  try {
    const { avatar } = req.body;

    await pool.query('UPDATE users SET avatar_url = $1 WHERE user_id = $2', [avatar, req.userId]);

    res.json({ message: 'Avatar selected', avatar });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to select avatar' });
  }
};

exports.uploadPhoto = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const filename = `blurred_${Date.now()}.jpg`;
    const outputPath = path.join('uploads', filename);

    await sharp(req.file.path)
      .blur(20)
      .toFile(outputPath);

    await fs.unlink(req.file.path);

    const photoUrl = `/uploads/${filename}`;
    await pool.query('UPDATE users SET blurred_photo_url = $1 WHERE user_id = $2', [photoUrl, req.userId]);

    res.json({ message: 'Photo uploaded', photoUrl });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to upload photo' });
  }
};

exports.reportUser = async (req, res) => {
  try {
    const { reportedId, reason } = req.body;

    await pool.query(
      'INSERT INTO reports (reporter_id, reported_id, reason) VALUES ($1, $2, $3)',
      [req.userId, reportedId, reason]
    );

    res.json({ message: 'User reported' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to report user' });
  }
};

exports.blockUser = async (req, res) => {
  try {
    const { blockedId } = req.body;

    await pool.query(
      'INSERT INTO blocks (blocker_id, blocked_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [req.userId, blockedId]
    );

    res.json({ message: 'User blocked' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to block user' });
  }
};
