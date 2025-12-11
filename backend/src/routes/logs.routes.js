/**
 * Log Routes
 * RESTful endpoints for log operations
 */

const express = require('express');
const router = express.Router();
const logController = require('../controllers/LogController');

/**
 * @swagger
 * tags:
 *   name: Logs
 *   description: Logging operations
 */

/**
 * @swagger
 * /logs:
 *   post:
 *     summary: Add a new log entry
 *     tags: [Logs]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *               - details
 *             properties:
 *               type:
 *                 type: string
 *                 description: Log type (e.g. error, info, custom)
 *               details:
 *                 type: string
 *               folderId:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Log entry added
 */
router.post('/', logController.addLog);

module.exports = router;
