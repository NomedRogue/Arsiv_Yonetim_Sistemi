/**
 * Folder Controller
 * Handles HTTP requests for folder operations
 * Thin layer - delegates business logic to FolderService
 */

const { getFolderService } = require('../services/FolderService');
const logger = require('../utils/logger');

const folderService = getFolderService();

/**
 * Get all folders with filters and pagination
 * GET /api/folders?page=1&limit=20&category=Tıbbi...
 */
async function getFolders(req, res, next) {
  try {
    const options = {
      page: req.query.page ? parseInt(String(req.query.page), 10) : 1,
      limit: req.query.limit ? parseInt(String(req.query.limit), 10) : 20,
      sortBy: req.query.sortBy || 'updatedAt',
      order: req.query.order || 'desc',
      general: req.query.general,
      category: req.query.category,
      departmentId: req.query.departmentId,
      clinic: req.query.clinic,
      fileCode: req.query.fileCode,
      subject: req.query.subject,
      specialInfo: req.query.specialInfo,
      startYear: req.query.startYear,
      endYear: req.query.endYear,
      retentionCode: req.query.retentionCode,
      status: req.query.status
    };

    // Remove undefined/null options
    const cleanOptions = Object.fromEntries(
      Object.entries(options).filter(([_, v]) => v != null && v !== '')
    );

    const result = await folderService.searchFolders(cleanOptions);

    res.json({
      folders: result.items,
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages
    });
  } catch (error) {
    logger.error('[FOLDER_CONTROLLER] getFolders error:', { error });
    next(error);
  }
}

/**
 * Get folder by ID
 * GET /api/folders/:id
 */
async function getFolderById(req, res, next) {
  try {
    const folder = await folderService.getFolderById(req.params.id);
    
    if (!folder) {
      return res.status(404).json({ error: 'Klasör bulunamadı' });
    }

    res.json(folder);
  } catch (error) {
    logger.error('[FOLDER_CONTROLLER] getFolderById error:', { error, id: req.params.id });
    next(error);
  }
}

/**
 * Create new folder
 * POST /api/folders
 */
async function createFolder(req, res, next) {
  try {
    const folder = await folderService.createFolder(req.body);
    
    // Broadcast SSE event
    const { sseBroadcast } = require('../utils/sse');
    sseBroadcast('folder_created', { ...folder, ts: new Date() });

    res.status(201).json(folder);
  } catch (error) {
    logger.error('[FOLDER_CONTROLLER] createFolder error:', { error, body: req.body });
    next(error);
  }
}

/**
 * Update folder
 * PUT /api/folders/:id
 */
async function updateFolder(req, res, next) {
  try {
    const folder = await folderService.updateFolder(req.params.id, req.body);

    // Broadcast SSE event
    const { sseBroadcast } = require('../utils/sse');
    sseBroadcast('folder_updated', { ...folder, ts: new Date() });

    res.json(folder);
  } catch (error) {
    logger.error('[FOLDER_CONTROLLER] updateFolder error:', { error, id: req.params.id });
    next(error);
  }
}

/**
 * Delete folder
 * DELETE /api/folders/:id
 */
async function deleteFolder(req, res, next) {
  try {
    await folderService.deleteFolder(req.params.id);

    // Broadcast SSE event
    const { sseBroadcast } = require('../utils/sse');
    sseBroadcast('folder_deleted', { folderId: req.params.id, ts: new Date() });

    res.status(204).send();
  } catch (error) {
    logger.error('[FOLDER_CONTROLLER] deleteFolder error:', { error, id: req.params.id });
    next(error);
  }
}

/**
 * Get folders by location
 * POST /api/folders-by-location
 */
async function getFoldersByLocation(req, res, next) {
  try {
    const location = req.body;
    
    if (!location || !location.storageType) {
      return res.status(400).json({ error: 'Location data is required.' });
    }

    const folders = await folderService.getFoldersByLocation(location);
    res.json(folders);
  } catch (error) {
    logger.error('[FOLDER_CONTROLLER] getFoldersByLocation error:', { error });
    next(error);
  }
}

/**
 * Get all folders for analysis
 * GET /api/all-folders-for-analysis
 */
async function getAllFoldersForAnalysis(req, res, next) {
  try {
    const folders = await folderService.getAllForAnalysis();
    res.json(folders);
  } catch (error) {
    logger.error('[FOLDER_CONTROLLER] getAllFoldersForAnalysis error:', { error });
    next(error);
  }
}

/**
 * Get disposable folders
 * GET /api/folders/disposable?filter=thisYear|nextYear|overdue|all
 */
async function getDisposableFolders(req, res, next) {
  try {
    const { filter } = req.query;
    const folders = await folderService.getDisposableFolders(filter);
    res.json(folders);
  } catch (error) {
    logger.error('[FOLDER_CONTROLLER] getDisposableFolders error:', { error });
    next(error);
  }
}

module.exports = {
  getFolders,
  getFolderById,
  createFolder,
  updateFolder,
  deleteFolder,
  getFoldersByLocation,
  getAllFoldersForAnalysis,
  getDisposableFolders
};
