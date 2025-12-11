/**
 * PDF Routes
 * RESTful endpoints for PDF upload/delete operations
 */

const express = require('express');
const router = express.Router();
const pdfController = require('../controllers/PdfController');
const { uploadLimiter } = require('../middleware/rateLimiter');

/**
 * @swagger
 * tags:
 *   name: PDF
 *   description: PDF file operations
 */

/**
 * @swagger
 * /pdf/upload-pdf:
 *   post:
 *     summary: Upload a PDF file
 *     tags: [PDF]
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: PDF uploaded
 */
router.post('/upload-pdf', uploadLimiter, pdfController.uploadPdf);

/**
 * @swagger
 * /pdf/delete-pdf/{filename}:
 *   delete:
 *     summary: Delete a PDF file
 *     tags: [PDF]
 *     parameters:
 *       - in: path
 *         name: filename
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: File deleted
 */
router.delete('/delete-pdf/:filename', pdfController.deletePdf);

/**
 * @swagger
 * /pdf/pdf-path/{filename}:
 *   get:
 *     summary: Get local file path of PDF (Electron only)
 *     tags: [PDF]
 *     parameters:
 *       - in: path
 *         name: filename
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: File path returned
 */
router.get('/pdf-path/:filename', pdfController.getPdfPath);

/**
 * @swagger
 * /pdf/serve-pdf/{filename}:
 *   get:
 *     summary: View/Download PDF file
 *     tags: [PDF]
 *     parameters:
 *       - in: path
 *         name: filename
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: File stream
 */
router.get('/serve-pdf/:filename', pdfController.servePdf);

module.exports = router;
