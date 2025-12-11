/**
 * Search Routes
 * RESTful endpoints for Excel search operations
 */

const express = require('express');
const router = express.Router();
const searchController = require('../controllers/SearchController');

/**
 * @swagger
 * tags:
 *   name: Search
 *   description: Advanced search operations (Excel, etc.)
 */

/**
 * @swagger
 * /search/excel:
 *   get:
 *     summary: Search within uploaded Excel files
 *     tags: [Search]
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         required: true
 *         description: Search term
 *     responses:
 *       200:
 *         description: Search results
 */
router.get('/excel', searchController.searchInExcel);

/**
 * @swagger
 * /search/excel/files:
 *   get:
 *     summary: List all indexed Excel files
 *     tags: [Search]
 *     responses:
 *       200:
 *         description: List of Excel files
 */
router.get('/excel/files', searchController.listExcelFiles);

module.exports = router;
