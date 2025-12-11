/**
 * Excel Routes
 * RESTful endpoints for Excel upload/delete operations
 */

const express = require('express');
const router = express.Router();
const excelController = require('../controllers/ExcelController');
const { uploadLimiter } = require('../middleware/rateLimiter');

/**
 * @swagger
 * tags:
 *   name: Excel
 *   description: Excel file operations
 */

/**
 * @swagger
 * /excel/upload-excel:
 *   post:
 *     summary: Upload an Excel file
 *     tags: [Excel]
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
 *         description: Excel uploaded
 */
router.post('/upload-excel', uploadLimiter, excelController.uploadExcel);

/**
 * @swagger
 * /excel/delete-excel/{filename}:
 *   delete:
 *     summary: Delete an Excel file
 *     tags: [Excel]
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
router.delete('/delete-excel/:filename', excelController.deleteExcel);

/**
 * @swagger
 * /excel/excel-path/{filename}:
 *   get:
 *     summary: Get local file path of Excel (Electron only)
 *     tags: [Excel]
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
router.get('/excel-path/:filename', excelController.getExcelPath);

/**
 * @swagger
 * /excel/serve-excel/{filename}:
 *   get:
 *     summary: Download/View Excel file
 *     tags: [Excel]
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
router.get('/serve-excel/:filename', excelController.serveExcel);

module.exports = router;
