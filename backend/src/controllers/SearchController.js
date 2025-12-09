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

    // Get Excel search results (dosyaNo, hastaAdi, kaynak)
    const excelResults = await excelSearchService.searchInExcel(query);
    
    // Get unique filenames from search results
    const filenames = [...new Set(excelResults.map(r => r.kaynak))];
    
    // Get only folders related to found Excel files (Optimized)
    const repos = getRepositories();
    const folders = repos.folder.findByExcelNames(filenames);
    
    // Match Excel files with folders and group matches
    const folderMatches = new Map();
    
    for (const excelResult of excelResults) {
      const matchedFolder = folders.find(f => f.excelPath === excelResult.kaynak);
      
      if (matchedFolder) {
        if (!folderMatches.has(matchedFolder.id)) {
          folderMatches.set(matchedFolder.id, {
            ...matchedFolder,
            matchedDosyaNo: [],
            matchedHastaAdi: []
          });
        }
        
        const folderData = folderMatches.get(matchedFolder.id);
        if (excelResult.dosyaNo) {
          folderData.matchedDosyaNo.push({
            sira: excelResult.sira,
            value: excelResult.dosyaNo
          });
        }
        if (excelResult.hastaAdi) {
          folderData.matchedHastaAdi.push({
            sira: excelResult.sira,
            value: excelResult.hastaAdi
          });
        }
      }
    }
    
    const results = Array.from(folderMatches.values());
    
    logger.info('[SEARCH_CONTROLLER] Excel search completed:', {
      query,
      excelMatches: excelResults.length,
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
