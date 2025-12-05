/**
 * Search Routes
 * RESTful endpoints for Excel search operations
 */

const express = require('express');
const router = express.Router();
const searchController = require('../controllers/SearchController');

// GET /api/search/excel - Search in Excel files
router.get('/excel', searchController.searchInExcel);

// GET /api/search/excel/files - List Excel files
router.get('/excel/files', searchController.listExcelFiles);

module.exports = router;
