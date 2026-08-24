// ============================================================
// ROUTES — Index (Mount all routers)
// ============================================================
'use strict';

const express = require('express');
const router = express.Router();

router.use('/auth',         require('./authRoutes'));
router.use('/doctors',      require('./doctorRoutes'));
router.use('/slots',        require('./slotRoutes'));
router.use('/appointments', require('./appointmentRoutes'));
router.use('/admin',        require('./adminRoutes'));
router.use('/ai',           require('./aiRoutes'));

// Health check
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

module.exports = router;
