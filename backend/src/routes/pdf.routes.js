/**
 * PDF Routes
 * RESTful endpoints for PDF upload/delete operations
 */

const express = require('express');
const router = express.Router();
const pdfController = require('../controllers/PdfController');
const { uploadLimiter } = require('../middleware/rateLimiter');

// POST /api/pdf/upload-pdf - Upload PDF file
router.post('/upload-pdf', uploadLimiter, pdfController.uploadPdf);

// DELETE /api/pdf/delete-pdf/:filename - Delete PDF file
router.delete('/delete-pdf/:filename', pdfController.deletePdf);

// GET /api/pdf/pdf-path/:filename - Get PDF file path for Electron
router.get('/pdf-path/:filename', pdfController.getPdfPath);

// GET /api/pdf/serve-pdf/:filename - Serve PDF file for browser
router.get('/serve-pdf/:filename', pdfController.servePdf);

module.exports = router;
