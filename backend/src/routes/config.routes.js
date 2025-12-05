/**
 * Config Routes
 * RESTful endpoints for configuration operations
 */

const express = require('express');
const router = express.Router();
const configController = require('../controllers/ConfigController');

// GET /api/all-data - Get all configs and data
router.get('/all-data', configController.getAllData);

// POST /api/save-configs - Save multiple configs
router.post('/save-configs', configController.saveConfigs);

module.exports = router;
