/**
 * Disposal Controller
 * Handles disposal operations
 */

const { getRepositories } = require('../database/repositories');
const { withTransaction } = require('../database/connection');
const { sseBroadcast } = require('../utils/sse');
const logger = require('../utils/logger');

const disposalController = {
  /**
   * GET /api/disposals
   * Get all disposals with folder data
   */
  async getAllDisposals(req, res, next) {
    try {
      const repos = getRepositories();
      const disposals = repos.disposal.getAll();
      const departments = repos.config.get('departments') || [];
      
      // Helper function to get department name
      const getDepartmentName = (departmentId) => {
        const dept = departments.find(d => d.id === departmentId);
        return dept ? dept.name : 'Bilinmiyor';
      };
      
      // Enrich with folder data if not already present
      const enrichedDisposals = disposals.map(disposal => {
        let folderData = disposal.originalFolderData;
        
        if (!folderData) {
          const folder = repos.folder.getById(disposal.folderId);
          folderData = folder || {
            id: disposal.folderId,
            category: 'Bilinmiyor',
            departmentId: 0,
            subject: 'Silinmiş Klasör',
            fileCode: '-',
            fileYear: 0,
            fileCount: 0
          };
        }
        
        // Departman adını ekle
        return {
          ...disposal,
          originalFolderData: {
            ...folderData,
            departmentName: getDepartmentName(folderData.departmentId)
          }
        };
      });
      
      res.json(enrichedDisposals);
    } catch (error) {
      logger.error('[DISPOSAL CONTROLLER] Get all disposals failed:', error);
      next(error);
    }
  },

  /**
   * POST /api/disposals
   * Create new disposal and delete folder from folders table
   * Uses database transaction for atomicity
   */
  async createDisposal(req, res, next) {
    try {
      const repos = getRepositories();
      
      // Önce klasörü al (originalFolderData için)
      const folder = repos.folder.getById(req.body.folderId);
      
      // Transaction içinde hem disposal oluştur hem folder sil
      const newDisposal = withTransaction(() => {
        // Disposal kaydını oluştur (originalFolderData ile birlikte)
        const disposalData = {
          ...req.body,
          originalFolderData: folder || req.body.originalFolderData
        };
        const disposal = repos.disposal.insert(disposalData);
        
        // Klasörü folders tablosundan SİL
        if (folder) {
          repos.folder.delete(req.body.folderId);
        }
        
        return disposal;
      });
      
      // Transaction başarılı, log ve broadcast yap (bu kısımlar transaction dışında)
      if (folder) {
        const logDetails = `Klasör imha edildi: ${folder.fileCode || 'Kod Yok'} - ${folder.subject || 'Konu Yok'} (${folder.fileYear || 'Yıl Yok'})`;
        repos.log.addLog({ 
          type: 'dispose', 
          details: logDetails 
        });
      }
      
      // SSE broadcast
      sseBroadcast('folder_deleted', { 
        folderId: req.body.folderId,
        ts: new Date()
      });
      
      res.status(201).json(newDisposal);
    } catch (error) {
      logger.error('[DISPOSAL CONTROLLER] Create disposal failed:', error);
      next(error);
    }
  }
};

module.exports = disposalController;
