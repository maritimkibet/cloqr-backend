const pool = require('../config/database');
const crypto = require('crypto');

// Generate unique QR code
const generateQRCode = () => {
  return crypto.randomBytes(16).toString('hex');
};

// Create campus verification QR code (Admin only)
exports.createCampusQR = async (req, res) => {
  try {
    const { campusName } = req.body;

    if (!req.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const qrCode = generateQRCode();

    const result = await pool.query(
      'INSERT INTO campus_qr_codes (campus_name, qr_code) VALUES ($1, $2) RETURNING *',
      [campusName, qrCode]
    );

    res.json({ 
      message: 'Campus QR code created',
      qr: result.rows[0]
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create campus QR' });
  }
};

// Get all campus QR codes (Admin only)
exports.getAllCampusQRs = async (req, res) => {
  try {
    if (!req.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const result = await pool.query(
      'SELECT * FROM campus_qr_codes ORDER BY created_at DESC'
    );

    res.json({ qrCodes: result.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch campus QRs' });
  }
};

// Verify campus QR code (Public)
exports.verifyCampusQR = async (req, res) => {
  try {
    const { qrCode } = req.body;

    const result = await pool.query(
      'SELECT campus_name FROM campus_qr_codes WHERE qr_code = $1 AND is_active = true',
      [qrCode]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid QR code' });
    }

    res.json({ 
      valid: true,
      campus: result.rows[0].campus_name 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Verification failed' });
  }
};

// Deactivate campus QR code (Admin only)
exports.deactivateCampusQR = async (req, res) => {
  try {
    const { qrId } = req.params;

    if (!req.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    await pool.query(
      'UPDATE campus_qr_codes SET is_active = false WHERE qr_id = $1',
      [qrId]
    );

    res.json({ message: 'Campus QR code deactivated' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to deactivate QR' });
  }
};
