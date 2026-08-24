// ============================================================
// ROUTES — Slots (Hold / Release)
// ============================================================
'use strict';

const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const { placeHold, dropHold } = require('../controllers/slotController');

router.post('/:slotId/hold', authenticate, authorize('patient'), placeHold);
router.delete('/:slotId/hold', authenticate, authorize('patient'), dropHold);

module.exports = router;
