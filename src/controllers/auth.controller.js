const { validationResult } = require('express-validator');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const pool = require('../config/database');
const redisClient = require('../config/redis');
const { sendEmail } = require('../services/email.service');

const hashEmail = (email) => {
  return crypto.createHash('sha256').update(email.toLowerCase()).digest('hex');
};

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

exports.sendOTP = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email } = req.body;
    const emailHash = hashEmail(email);

    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await pool.query(
      'INSERT INTO otps (email_hash, otp_code, expires_at) VALUES ($1, $2, $3)',
      [emailHash, otp, expiresAt]
    );

    // Try to send email, but don't fail if it doesn't work
    try {
      await sendEmail(email, 'Cloqr - Verification Code', `Your OTP is: ${otp}`);
    } catch (emailError) {
      console.log('📧 Email service not configured, but OTP saved to database');
      console.log(`🔑 OTP for ${email}: ${otp}`);
    }

    // Always log OTP to console for testing
    console.log(`\n✅ OTP Generated for ${email}`);
    console.log(`🔑 OTP CODE: ${otp}`);
    console.log(`⏰ Expires at: ${expiresAt}\n`);

    res.json({ message: 'OTP sent successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to send OTP' });
  }
};

exports.verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const emailHash = hashEmail(email);

    const result = await pool.query(
      'SELECT * FROM otps WHERE email_hash = $1 AND otp_code = $2 AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1',
      [emailHash, otp]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    await pool.query('DELETE FROM otps WHERE email_hash = $1', [emailHash]);

    res.json({ message: 'OTP verified', emailHash });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Verification failed' });
  }
};

exports.register = async (req, res) => {
  try {
    const { email, username, campus, avatar, qrCode, password } = req.body;
    const emailHash = hashEmail(email);

    const existing = await pool.query('SELECT * FROM users WHERE email_hash = $1', [emailHash]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Check if admin login
    const isAdmin = email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD;

    if (!isAdmin) {
      // Regular user - must have valid campus QR code
      if (!qrCode) {
        return res.status(400).json({ error: 'Campus QR code required' });
      }

      const qrResult = await pool.query(
        'SELECT campus_name FROM campus_qr_codes WHERE qr_code = $1 AND is_active = true',
        [qrCode]
      );

      if (qrResult.rows.length === 0) {
        return res.status(400).json({ error: 'Invalid campus QR code' });
      }

      // Use campus from QR code
      campus = qrResult.rows[0].campus_name;
    }

    const result = await pool.query(
      'INSERT INTO users (email_hash, username, campus, avatar_url, is_verified, is_admin) VALUES ($1, $2, $3, $4, true, $5) RETURNING user_id, username, campus, avatar_url, is_admin',
      [emailHash, username, campus || 'Admin', avatar, isAdmin]
    );

    const user = result.rows[0];
    const token = jwt.sign({ userId: user.user_id, isAdmin: user.is_admin }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN
    });

    res.json({ token, user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Registration failed' });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const emailHash = hashEmail(email);

    // Check if admin login
    if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {
      const result = await pool.query('SELECT * FROM users WHERE email_hash = $1 AND is_admin = true', [emailHash]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Admin account not found. Please register first.' });
      }

      const user = result.rows[0];
      const token = jwt.sign({ userId: user.user_id, isAdmin: true }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN
      });

      return res.json({ token, user });
    }

    // Regular user login
    const result = await pool.query('SELECT * FROM users WHERE email_hash = $1', [emailHash]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    const token = jwt.sign({ userId: user.user_id, isAdmin: user.is_admin }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN
    });

    res.json({ token, user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Login failed' });
  }
};

exports.setupPIN = async (req, res) => {
  try {
    const { pin } = req.body;
    const pinHash = await bcrypt.hash(pin, 10);

    await pool.query('UPDATE users SET pin_hash = $1 WHERE user_id = $2', [pinHash, req.userId]);

    res.json({ message: 'PIN set successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to set PIN' });
  }
};

exports.verifyPIN = async (req, res) => {
  try {
    const { pin } = req.body;

    const result = await pool.query('SELECT pin_hash FROM users WHERE user_id = $1', [req.userId]);
    const user = result.rows[0];

    if (!user.pin_hash) {
      return res.status(400).json({ error: 'PIN not set' });
    }

    const isValid = await bcrypt.compare(pin, user.pin_hash);
    if (!isValid) {
      return res.status(400).json({ error: 'Invalid PIN' });
    }

    res.json({ message: 'PIN verified' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Verification failed' });
  }
};
