/**
 * Folder Routes
 * RESTful endpoints for folder operations
 */

const express = require('express');
const router = express.Router();
const folderController = require('../controllers/FolderController');
const { verifyToken, requireAdmin } = require('../middleware/authMiddleware');
const { uploadLimiter } = require('../middleware/rateLimiter');
const { createFolderValidation, updateFolderValidation, validate } = require('../middleware/validators/folderValidator');

/**
 * @swagger
 * tags:
 *   name: Folders
 *   description: Folder management API
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Folder:
 *       type: object
 *       required:
 *         - fileCode
 *         - subject
 *         - category
 *         - departmentId
 *         - fileYear
 *         - folderType
 *         - location
 *       properties:
 *         id:
 *           type: string
 *           description: Unique ID
 *         fileCode:
 *           type: string
 *           description: Unique file code (Barcode)
 *         subject:
 *           type: string
 *         category:
 *           type: string
 *           enum: [Tıbbi, İdari]
 *         departmentId:
 *           type: integer
 *         fileYear:
 *           type: integer
 *         folderType:
 *           type: string
 *           enum: [Dar, Geniş]
 *         location:
 *           type: object
 *           properties:
 *             storageType:
 *               type: string
 *               enum: [Kompakt, Stand]
 *             unit:
 *               type: integer
 *             shelf:
 *               type: integer
 *         status:
 *           type: string
 *           enum: [Arşivde, Çıkışta, İmha Edildi]
 */

// GET /api/folders/analysis/all - Get lightweight folder data for analysis (MUST BE BEFORE /:id)
router.get('/analysis/all', folderController.getAllFoldersForAnalysis);

// GET /api/folders/disposable - Get disposable folders (MUST BE BEFORE /:id)
router.get('/disposable', folderController.getDisposableFolders);

/**
 * @swagger
 * /folders:
 *   get:
 *     summary: Retrieve a paginated list of folders
 *     tags: [Folders]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Items per page
 *       - in: query
 *         name: general
 *         schema:
 *           type: string
 *         description: General search term (Search in all indexable fields)
 *     responses:
 *       200:
 *         description: A list of folders
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 folders:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Folder'
 *                 total:
 *                   type: integer
 *                 page:
 *                   type: integer
 *                 totalPages:
 *                   type: integer
 */
router.get('/', folderController.getFolders);

/**
 * @swagger
 * /folders/{id}:
 *   get:
 *     summary: Get a folder by ID
 *     tags: [Folders]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Folder ID
 *     responses:
 *       200:
 *         description: Folder details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Folder'
 *       404:
 *         description: Folder not found
 */
router.get('/:id', folderController.getFolderById);

/**
 * @swagger
 * /folders:
 *   post:
 *     summary: Create a new folder
 *     tags: [Folders]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Folder'
 *     responses:
 *       200:
 *         description: The created folder
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Folder'
 *       400:
 *         description: Validation error
 */
router.post(
  '/',
  verifyToken,
  uploadLimiter,
  createFolderValidation,
  validate,
  folderController.createFolder
);

/**
 * @swagger
 * /folders/{id}:
 *   put:
 *     summary: Update an existing folder
 *     tags: [Folders]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Folder ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Folder'
 *     responses:
 *       200:
 *         description: The updated folder
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Folder'
 *       404:
 *         description: Folder not found
 */
router.put(
  '/:id',
  verifyToken,
  updateFolderValidation,
  validate,
  folderController.updateFolder
);

/**
 * @swagger
 * /folders/{id}:
 *   delete:
 *     summary: Delete a folder
 *     tags: [Folders]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Folder ID
 *     responses:
 *       200:
 *         description: Folder deleted successfully
 *       400:
 *         description: Cannot delete folder (e.g. checked out)
 *       404:
 *         description: Folder not found
 */
router.delete('/:id', verifyToken, requireAdmin, folderController.deleteFolder);

/**
 * @swagger
 * /folders/by-location:
 *   post:
 *     summary: Get folders by location
 *     tags: [Folders]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               storageType:
 *                 type: string
 *                 enum: [Kompakt, Stand]
 *               unit:
 *                 type: integer
 *               shelf:
 *                 type: integer
 *     responses:
 *       200:
 *         description: List of folders in location
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Folder'
 */
router.post(
  '/by-location',
  folderController.getFoldersByLocation
);

module.exports = router;
