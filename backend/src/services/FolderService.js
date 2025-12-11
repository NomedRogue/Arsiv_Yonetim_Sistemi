const { getRepositories } = require('../database/repositories');
const logger = require('../utils/logger');
const FolderValidator = require('../validators/folder.validator');

class FolderService {
  constructor() {
    this.repos = getRepositories();
  }

  /**
   * Create new folder
   */
  async createFolder(folderData) {
    try {
      // Validation
      FolderValidator.validate(folderData);

      // Set timestamps
      const folder = {
        ...folderData,
        id: folderData.id || String(Date.now()), // ID'yi string olarak oluştur
        status: folderData.status || 'Arşivde',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Save to database
      const created = this.repos.folder.insert(folder);

      // Log the action
      this.repos.log.addLog({
        type: 'create',
        details: `Yeni klasör oluşturuldu: ${folder.fileCode} - ${folder.subject}`
      });

      logger.info('[FOLDER_SERVICE] Folder created:', { id: created.id, fileCode: created.fileCode });
      return created;
    } catch (error) {
      logger.error('[FOLDER_SERVICE] Create folder error:', { error, folderData });
      throw error;
    }
  }

  /**
   * Update existing folder
   */
  async updateFolder(folderId, updates) {
    try {
      // Get existing folder
      const existing = this.repos.folder.getById(folderId);
      if (!existing) {
        throw new Error('Klasör bulunamadı');
      }

      // Merge updates
      const updated = {
        ...existing,
        ...updates,
        id: folderId, // Ensure ID doesn't change
        updatedAt: new Date()
      };

      // Validate
      FolderValidator.validate(updated);

      // Save
      const result = this.repos.folder.update(folderId, updated);

      // Log
      this.repos.log.addLog({
        type: 'update',
        details: `Klasör güncellendi: ${result.fileCode} - ${result.subject}`
      });

      logger.info('[FOLDER_SERVICE] Folder updated:', { id: folderId });
      return result;
    } catch (error) {
      logger.error('[FOLDER_SERVICE] Update folder error:', { error, folderId, updates });
      throw error;
    }
  }

  /**
   * Delete folder and related data
   */
  async deleteFolder(folderId) {
    try {
      const folder = this.repos.folder.getById(folderId);
      if (!folder) {
        throw new Error('Klasör bulunamadı');
      }

      // Check if folder can be deleted
      if (folder.status === 'Çıkışta') {
        throw new Error('Bu klasör şu anda kullanıcıda olduğu için silinemez. Önce iade edilmesi gerekiyor.');
      }

      // Delete related checkouts
      const checkouts = this.repos.checkout.getByFolderId(folderId);
      for (const checkout of checkouts) {
        this.repos.checkout.delete(checkout.id);
      }

      // Delete related disposals
      const disposals = this.repos.disposal.getByFolderId(folderId);
      for (const disposal of disposals) {
        this.repos.disposal.delete(disposal.id);
      }

      // Delete folder
      this.repos.folder.delete(folderId);

      // Log
      this.repos.log.addLog({
        type: 'delete',
        details: `Klasör silindi: ${folder.fileCode} - ${folder.subject}`
      });

      logger.info('[FOLDER_SERVICE] Folder deleted:', { id: folderId });
      return true;
    } catch (error) {
      logger.error('[FOLDER_SERVICE] Delete folder error:', { error, folderId });
      throw error;
    }
  }

  /**
   * Get folder by ID
   */
  async getFolderById(folderId) {
    try {
      return this.repos.folder.getById(folderId);
    } catch (error) {
      logger.error('[FOLDER_SERVICE] Get folder error:', { error, folderId });
      throw error;
    }
  }

  /**
   * Search folders with filters
   */
  async searchFolders(filters) {
    try {
      return this.repos.folder.findWithFilters(filters);
    } catch (error) {
      logger.error('[FOLDER_SERVICE] Search folders error:', { error, filters });
      throw error;
    }
  }

  /**
   * Get folders by location
   */
  async getFoldersByLocation(location) {
    try {
      return this.repos.folder.findByLocation(location);
    } catch (error) {
      logger.error('[FOLDER_SERVICE] Get by location error:', { error, location });
      throw error;
    }
  }

  /**
   * Get dashboard statistics (optimized)
   * Uses database-level aggregation instead of loading all folders
   */
  async getDashboardStats() {
    try {
      return this.repos.folder.getDashboardStats();
    } catch (error) {
      logger.error('[FOLDER_SERVICE] Get dashboard stats error:', { error });
      throw error;
    }
  }

  /**
   * Get all folders for analysis (lightweight)
   * @deprecated Use getDashboardStats() for better performance
   */
  async getAllForAnalysis() {
    try {
      return this.repos.folder.getAllForAnalysis();
    } catch (error) {
      logger.error('[FOLDER_SERVICE] Get for analysis error:', { error });
      throw error;
    }
  }

  /**
   * Calculate storage occupancy
   * OPTIMIZED: Uses SQL aggregation in repository
   */
  calculateOccupancy(location, _ignoredFolders, settings) {
    try {
      // 2nd arg was 'folders' list, now ignored as we fetch needed data from DB

      const result = this.repos.folder.getOccupancyStats(location);
      const { stats, folders: foldersInLocation } = result;

      // Calculate used space based on counts
      let usedSpace = 0;

      stats.forEach(item => {
        const width = item.folderType === 'Dar'
          ? settings.darKlasorGenisligi
          : settings.genisKlasorGenisligi;
        usedSpace += (width * item.count);
      });

      // Calculate total space
      const shelfWidth = location.storageType === 'Kompakt'
        ? settings.kompaktRafGenisligi
        : settings.standRafGenisligi;

      const totalSpace = shelfWidth;

      return {
        used: usedSpace,
        total: totalSpace,
        percentage: totalSpace > 0 ? (usedSpace / totalSpace) * 100 : 0,
        folders: foldersInLocation // Return specific folders for UI list
      };
    } catch (error) {
      logger.error('[FOLDER_SERVICE] Calculate occupancy error:', { error, location });
      throw error;
    }
  }

  /**
   * Get disposable folders based on filter
   * OPTIMIZED: Uses SQL filtering in repository
   */
  async getDisposableFolders(filter) {
    try {
      return this.repos.folder.findDisposableFolders(filter);
    } catch (error) {
      logger.error('[FOLDER_SERVICE] Get disposable folders error:', { error, filter });
      throw error;
    }
  }
}

// Singleton instance
let instance = null;

function getFolderService() {
  if (!instance) {
    instance = new FolderService();
  }
  return instance;
}

module.exports = { FolderService, getFolderService };
