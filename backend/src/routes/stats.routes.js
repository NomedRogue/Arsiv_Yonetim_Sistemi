/**
 * Stats Routes
 * RESTful endpoints for statistics and analytics
 */

const express = require('express');
const router = express.Router();
const statsController = require('../controllers/StatsController');

/**
 * @swagger
 * tags:
 *   name: Stats
 *   description: Statistics and Analytics
 */

/**
 * @swagger
 * /stats/dashboard:
 *   get:
 *     summary: Get dashboard statistics (counts, charts, recent activities)
 *     tags: [Stats]
 *     responses:
 *       200:
 *         description: Dashboard statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalFolders:
 *                   type: integer
 *                 totalCheckouts:
 *                   type: integer
 *                 totalDisposals:
 *                   type: integer
 */
router.get('/dashboard', statsController.getDashboardStats);

/**
 * @swagger
 * /stats/disposal-year/{year}:
 *   get:
 *     summary: Get folders scheduled for disposal in a specific year
 *     tags: [Stats]
 *     parameters:
 *       - in: path
 *         name: year
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of folders
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Folder'
 */
router.get('/disposal-year/:year', statsController.getDisposalYearFolders);

module.exports = router;
