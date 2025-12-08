/**
 * Folder Service
 * Business logic for folder operations
 * Separates business rules from data access
 */

const { getRepositories } = require('../database/repositories');
const logger = require('../utils/logger');

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
      this.validateFolderData(folderData);

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
      this.validateFolderData(updated);

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
   * Get all folders for analysis (lightweight)
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
   */
  calculateOccupancy(location, folders, settings) {
    try {
      // Filter folders in the specified location
      const foldersInLocation = folders.filter(f => {
        if (f.status === 'İmha') return false;
        if (f.location.storageType !== location.storageType) return false;

        if (location.storageType === 'Kompakt') {
          return (
            (!location.unit || f.location.unit === location.unit) &&
            (!location.face || f.location.face === location.face) &&
            (!location.section || f.location.section === location.section) &&
            (!location.shelf || f.location.shelf === location.shelf)
          );
        } else if (location.storageType === 'Stand') {
          return (
            (!location.stand || f.location.stand === location.stand) &&
            (!location.shelf || f.location.shelf === location.shelf)
          );
        }

        return false;
      });

      // Calculate used space
      const usedSpace = foldersInLocation.reduce((sum, folder) => {
        const width = folder.folderType === 'Dar' 
          ? settings.darKlasorGenisligi 
          : settings.genisKlasorGenisligi;
        return sum + width;
      }, 0);

      // Calculate total space (bu hesaplama daha kompleks, şimdilik basit tutalım)
      const shelfWidth = location.storageType === 'Kompakt' 
        ? settings.kompaktRafGenisligi 
        : settings.standRafGenisligi;

      const totalSpace = shelfWidth; // Simplified

      return {
        used: usedSpace,
        total: totalSpace,
        percentage: totalSpace > 0 ? (usedSpace / totalSpace) * 100 : 0,
        folders: foldersInLocation
      };
    } catch (error) {
      logger.error('[FOLDER_SERVICE] Calculate occupancy error:', { error, location });
      throw error;
    }
  }

  /**
   * Get disposable folders based on filter
   */
  async getDisposableFolders(filter) {
    try {
      const currentYear = new Date().getFullYear();
      const allFolders = this.repos.folder.getAll();
      
      return allFolders.filter(folder => {
        if (folder.status !== 'Arşivde') return false;
        
        const disposalYear = folder.fileYear + folder.retentionPeriod + 1;
        
        if (filter === 'thisYear') {
          return disposalYear === currentYear;
        } else if (filter === 'nextYear') {
          return disposalYear === currentYear + 1;
        } else if (filter === 'overdue') {
          return disposalYear < currentYear;
        }
        
        return true; // 'all' or no filter
      });
    } catch (error) {
      logger.error('[FOLDER_SERVICE] Get disposable folders error:', { error, filter });
      throw error;
    }
  }

  /**
   * Validate folder data
   */
  validateFolderData(folder) {
    const errors = [];

    if (!folder.fileCode) errors.push('Dosya kodu gerekli');
    if (!folder.subject) errors.push('Konu gerekli');
    if (!folder.category) errors.push('Kategori gerekli');
    if (!folder.departmentId) errors.push('Birim ID gerekli');
    if (!folder.fileYear) errors.push('Dosya yılı gerekli');
    if (!folder.fileCount) errors.push('Dosya sayısı gerekli');
    if (!folder.folderType) errors.push('Klasör tipi gerekli');
    if (!folder.retentionPeriod) errors.push('Saklama süresi gerekli');
    if (!folder.retentionCode) errors.push('Saklama kodu gerekli');
    if (!folder.location || !folder.location.storageType) {
      errors.push('Lokasyon gerekli');
    }

    if (errors.length > 0) {
      throw new Error(`Validation hatası: ${errors.join(', ')}`);
    }

    return true;
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
