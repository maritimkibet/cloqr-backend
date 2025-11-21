const express = require('express');
const router = express.Router();

const authRoutes = require('./auth.routes');
const profileRoutes = require('./profile.routes');
const matchRoutes = require('./match.routes');
const chatRoutes = require('./chat.routes');
const roomRoutes = require('./room.routes');
const campusRoutes = require('./campus.routes');

router.use('/auth', authRoutes);
router.use('/profile', profileRoutes);
router.use('/match', matchRoutes);
router.use('/chat', chatRoutes);
router.use('/rooms', roomRoutes);
router.use('/campus', campusRoutes);

module.exports = router;
