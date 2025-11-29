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

// Skip OTP - No longer needed
exports.sendOTP = async (req, res) => {
  try {
    const { email } = req.body;
    
    // Just validate email format
    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Valid email required' });
    }

    // Return success immediately - no OTP needed
    res.json({ 
      message: 'Email validated',
      emailHash: hashEmail(email)
    });
  } catch (error) {
    console.error('Email validation error:', error);
    res.status(500).json({ error: 'Validation failed' });
  }
};

// Skip OTP verification - No longer needed
exports.verifyOTP = async (req, res) => {
  try {
    const { email } = req.body;
    const emailHash = hashEmail(email);

    // Just return the email hash - no verification needed
    res.json({ 
      message: 'Email verified', 
      emailHash 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Verification failed' });
  }
};

exports.register = async (req, res) => {
  try {
    let { email, username, campus, avatar, qrCode, password } = req.body;
    const emailHash = hashEmail(email);

    // Validate required fields
    if (!email || !username || !password) {
      return res.status(400).json({ error: 'Email, username, and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Check if user already exists
    const existing = await pool.query('SELECT * FROM users WHERE email_hash = $1', [emailHash]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'User already exists. Please login instead.' });
    }

    // Check if this is admin registration
    const isAdminEmail = email.toLowerCase() === process.env.ADMIN_EMAIL.toLowerCase();
    const isAdmin = isAdminEmail && password === process.env.ADMIN_PASSWORD;

    let finalCampus = campus;
    let passwordHash;

    if (isAdmin) {
      // Admin registration
      finalCampus = campus || 'Admin';
      // For admin, store the admin password hash
      passwordHash = await bcrypt.hash(password, 10);
      
      console.log(`✅ Admin registration: ${email}`);
    } else {
      // Regular user registration - must have valid campus QR code
      if (!qrCode) {
        return res.status(400).json({ error: 'Campus QR code required for registration' });
      }

      const qrResult = await pool.query(
        'SELECT campus_name FROM campus_qr_codes WHERE qr_code = $1 AND is_active = true',
        [qrCode]
      );

      if (qrResult.rows.length === 0) {
        return res.status(400).json({ error: 'Invalid or inactive campus QR code' });
      }

      // Use campus from QR code
      finalCampus = qrResult.rows[0].campus_name;
      
      // Hash the password for regular users
      passwordHash = await bcrypt.hash(password, 10);
      
      console.log(`✅ User registration: ${email} at ${finalCampus}`);
    }

    // Insert user into database
    const result = await pool.query(
      'INSERT INTO users (email_hash, username, campus, avatar_url, is_verified, is_admin, pin_hash) VALUES ($1, $2, $3, $4, true, $5, $6) RETURNING user_id, username, campus, avatar_url, is_admin, trust_score, mode',
      [emailHash, username, finalCampus, avatar, isAdmin, passwordHash]
    );

    const user = result.rows[0];
    
    // Generate JWT token
    const token = jwt.sign(
      { userId: user.user_id, isAdmin: user.is_admin }, 
      process.env.JWT_SECRET, 
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.json({ 
      token, 
      user,
      message: isAdmin ? 'Admin registered successfully' : 'Registration successful'
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const emailHash = hashEmail(email);

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user by email
    const result = await pool.query('SELECT * FROM users WHERE email_hash = $1', [emailHash]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];

    // Check if this is admin trying to login
    const isAdminEmail = email.toLowerCase() === process.env.ADMIN_EMAIL.toLowerCase();
    
    if (isAdminEmail) {
      // Admin must use admin password
      if (password !== process.env.ADMIN_PASSWORD) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }
      
      // Admin login successful
      const token = jwt.sign(
        { userId: user.user_id, isAdmin: true }, 
        process.env.JWT_SECRET, 
        { expiresIn: process.env.JWT_EXPIRES_IN }
      );
      
      return res.json({ 
        token, 
        user: { ...user, is_admin: true } 
      });
    }

    // Regular user login - verify password hash
    if (!user.pin_hash) {
      return res.status(400).json({ 
        error: 'Account not set up properly. Please register again.' 
      });
    }

    // Compare provided password with stored hash
    const isValidPassword = await bcrypt.compare(password, user.pin_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Regular user login successful
    const token = jwt.sign(
      { userId: user.user_id, isAdmin: user.is_admin || false }, 
      process.env.JWT_SECRET, 
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.json({ token, user });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed. Please try again.' });
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
