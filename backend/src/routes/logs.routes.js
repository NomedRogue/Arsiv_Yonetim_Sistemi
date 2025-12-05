/**
 * Log Routes
 * RESTful endpoints for log operations
 */

const express = require('express');
const router = express.Router();
const logController = require('../controllers/LogController');

// POST /api/logs - Add log entry
router.post('/', logController.addLog);

module.exports = router;
