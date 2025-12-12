/**
 * Config Routes
 * RESTful endpoints for configuration operations
 */

const express = require('express');
const router = express.Router();
const configController = require('../controllers/ConfigController');
const { verifyToken, requireAdmin } = require('../middleware/authMiddleware');

/**
 * @swagger
 * tags:
 *   name: Config
 *   description: Application configuration
 */

/**
 * @swagger
 * /config/all-data:
 *   get:
 *     summary: Get all application configuration and data
 *     tags: [Config]
 *     responses:
 *       200:
 *         description: All configs
 */
router.get('/all-data', verifyToken, configController.getAllData);

/**
 * @swagger
 * /config/save-configs:
 *   post:
 *     summary: Save multiple configurations
 *     tags: [Config]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Configs saved
 */
router.post('/save-configs', verifyToken, configController.saveConfigs);

module.exports = router;
