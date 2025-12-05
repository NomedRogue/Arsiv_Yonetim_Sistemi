/**
 * Excel Routes
 * RESTful endpoints for Excel upload/delete operations
 */

const express = require('express');
const router = express.Router();
const excelController = require('../controllers/ExcelController');
const { uploadLimiter } = require('../middleware/rateLimiter');

// POST /api/excel/upload-excel - Upload Excel file
router.post('/upload-excel', uploadLimiter, excelController.uploadExcel);

// DELETE /api/excel/delete-excel/:filename - Delete Excel file
router.delete('/delete-excel/:filename', excelController.deleteExcel);

// GET /api/excel/excel-path/:filename - Get Excel file path for Electron
router.get('/excel-path/:filename', excelController.getExcelPath);

// GET /api/excel/serve-excel/:filename - Serve Excel file for browser
router.get('/serve-excel/:filename', excelController.serveExcel);

module.exports = router;
