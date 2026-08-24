// ============================================================
// ROUTES — Admin
// ============================================================
'use strict';

const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const { getPlatformStats, getNotificationQueue, retryNotificationJob } = require('../controllers/adminController');

router.use(authenticate, authorize('admin')); // All admin routes require authentication

router.get('/stats', getPlatformStats);
router.get('/notification-queue', getNotificationQueue);
router.post('/notification-queue/:id/retry', retryNotificationJob);

module.exports = router;
