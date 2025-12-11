/**
 * Search Controller
 * Handles HTTP requests for Excel search operations
 */

const { getExcelSearchService } = require('../services/ExcelSearchService');
const { getRepositories } = require('../database/repositories');
const logger = require('../utils/logger');

const excelSearchService = getExcelSearchService();

/**
 * Search in Excel files and match with folders
 * GET /api/search/excel?q=query
 */
async function searchInExcel(req, res, next) {
  try {
    const query = req.query.q;
    
    if (!query || query.trim().length < 2) {
      return res.status(400).json({ error: 'Arama sorgusu en az 2 karakter olmalıdır' });
    }

    // Delegate business logic to service layer
    const results = await excelSearchService.searchAndMatch(query);
    
    logger.info('[SEARCH_CONTROLLER] Excel search completed:', {
      query,
      folderMatches: results.length
    });
    
    res.json(results);
  } catch (error) {
    logger.error('[SEARCH_CONTROLLER] searchInExcel error:', { error, query: req.query.q });
    next(error);
  }
}





/**
 * List Excel files
 * GET /api/search/excel/files
 */
async function listExcelFiles(req, res, next) {
  try {
    const files = await excelSearchService.listExcelFiles();
    res.json(files);
  } catch (error) {
    logger.error('[SEARCH_CONTROLLER] listExcelFiles error:', { error });
    next(error);
  }
}



module.exports = {
  searchInExcel,
  listExcelFiles
};
