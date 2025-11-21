const express = require('express');
const router = express.Router();
const campusController = require('../controllers/campus.controller');
const { authenticate } = require('../middleware/auth');

// Public route - verify QR code
router.post('/verify-qr', campusController.verifyCampusQR);

// Admin routes - require authentication
router.post('/qr', authenticate, campusController.createCampusQR);
router.get('/qr', authenticate, campusController.getAllCampusQRs);
router.patch('/qr/:qrId/deactivate', authenticate, campusController.deactivateCampusQR);

module.exports = router;
