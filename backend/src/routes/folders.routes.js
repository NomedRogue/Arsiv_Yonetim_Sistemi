/**
 * Folder Routes
 * RESTful endpoints for folder operations
 */

const express = require('express');
const router = express.Router();
const folderController = require('../controllers/FolderController');
const { uploadLimiter } = require('../middleware/rateLimiter');

// GET /api/folders/analysis/all - Get lightweight folder data for analysis (MUST BE BEFORE /:id)
router.get('/analysis/all', folderController.getAllFoldersForAnalysis);

// GET /api/folders/disposable - Get disposable folders (MUST BE BEFORE /:id)
router.get('/disposable', folderController.getDisposableFolders);

// GET /api/folders - List folders with filters and pagination
router.get('/', folderController.getFolders);

// GET /api/folders/:id - Get single folder by ID
router.get('/:id', folderController.getFolderById);

// POST /api/folders - Create new folder
router.post(
  '/',
  uploadLimiter,
  folderController.createFolder
);

// PUT /api/folders/:id - Update existing folder
router.put(
  '/:id',
  folderController.updateFolder
);

// DELETE /api/folders/:id - Delete folder
router.delete('/:id', folderController.deleteFolder);

// POST /api/folders/by-location - Get folders by location
router.post(
  '/by-location',
  folderController.getFoldersByLocation
);

module.exports = router;
