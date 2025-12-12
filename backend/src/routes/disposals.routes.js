/**
 * Disposal Routes
 * RESTful endpoints for disposal operations
 */

const express = require('express');
const router = express.Router();
const disposalController = require('../controllers/DisposalController');
const { verifyToken } = require('../middleware/authMiddleware');

/**
 * @swagger
 * tags:
 *   name: Disposals
 *   description: Folder disposal management
 */

/**
 * @swagger
 * /disposals:
 *   get:
 *     summary: Get all disposal records
 *     tags: [Disposals]
 *     responses:
 *       200:
 *         description: List of disposed folders
 */
router.get('/', verifyToken, disposalController.getAllDisposals);

/**
 * @swagger
 * /disposals:
 *   post:
 *     summary: Create a new disposal record (Dispose a folder)
 *     tags: [Disposals]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - folderId
 *               - disposalDate
 *             properties:
 *               folderId:
 *                 type: string
 *               disposalDate:
 *                 type: string
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Disposal created
 */
router.post('/', verifyToken, disposalController.createDisposal);

module.exports = router;
