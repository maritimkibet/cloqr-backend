const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const authController = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth');

router.post('/send-otp',
  body('email').isEmail().withMessage('Valid email required'),
  authController.sendOTP
);

router.post('/verify-otp',
  body('email').isEmail(),
  body('otp').isLength({ min: 6, max: 6 }),
  authController.verifyOTP
);

router.post('/register',
  body('email').isEmail(),
  body('username').isLength({ min: 3, max: 50 }),
  body('campus').notEmpty(),
  authController.register
);

router.post('/login',
  body('email').isEmail(),
  authController.login
);

router.post('/setup-pin',
  authenticate,
  body('pin').isLength({ min: 4, max: 6 }),
  authController.setupPIN
);

router.post('/verify-pin',
  authenticate,
  body('pin').isLength({ min: 4, max: 6 }),
  authController.verifyPIN
);

module.exports = router;
