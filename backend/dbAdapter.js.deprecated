/**
 * Database Manager - Legacy Adapter
 * Bu dosya mevcut API'yi korurken yeni repository pattern'e yönlendirir
 * Backward compatibility için kritik!
 */

const { getDbInstance, closeDb, reconnectDb } = require('./src/database/connection');
const { getRepositories } = require('./src/database/repositories');
const logger = require('./src/utils/logger');

// Lazy-loaded repositories
let repos = null;

function getRepos() {
  if (!repos) {
    repos = getRepositories();
  }
  return repos;
}

/**
 * Legacy API - Mevcut kod ile uyumlu interface
 */
module.exports = {
  // Connection methods
  getDbInstance,
  closeDb,
  reconnectDb,
  
  migrate() {
    // Migration artık connection.js içinde otomatik yapılıyor
    getDbInstance();
    logger.info('[DB] Veritabanı başlatma işlemi tamamlandı');
  },

  // Config methods
  getConfig(key) {
    return getRepos().config.get(key);
  },

  setConfig(key, value) {
    return getRepos().config.set(key, value);
  },

  // Generic CRUD (legacy support)
  getList(tableName) {
    const repo = getRepos()[tableName.replace(/s$/, '')]; // 'folders' -> 'folder'
    if (repo && typeof repo.getAll === 'function') {
      return repo.getAll();
    }
    throw new Error(`Repository not found for table: ${tableName}`);
  },

  getById(tableName, id) {
    const repo = getRepos()[tableName.replace(/s$/, '')];
    if (repo && typeof repo.getById === 'function') {
      return repo.getById(id);
    }
    throw new Error(`Repository not found for table: ${tableName}`);
  },

  insert(tableName, item) {
    const repo = getRepos()[tableName.replace(/s$/, '')];
    if (repo && typeof repo.insert === 'function') {
      return repo.insert(item);
    }
    throw new Error(`Repository not found for table: ${tableName}`);
  },

  update(tableName, item) {
    const repo = getRepos()[tableName.replace(/s$/, '')];
    if (repo && typeof repo.update === 'function') {
      return repo.update(item.id, item);
    }
    throw new Error(`Repository not found for table: ${tableName}`);
  },

  remove(tableName, id) {
    const repo = getRepos()[tableName.replace(/s$/, '')];
    if (repo && typeof repo.delete === 'function') {
      return repo.delete(id);
    }
    throw new Error(`Repository not found for table: ${tableName}`);
  },

  // Log methods
  addLog(logData) {
    return getRepos().log.addLog(logData);
  },

  // Folder-specific methods
  getFolderById(id) {
    return getRepos().folder.getById(id);
  },

  insertFolder(folderData) {
    return getRepos().folder.insert(folderData);
  },

  updateFolder(folderData) {
    return getRepos().folder.update(folderData.id, folderData);
  },

  deleteFolderAndRelations(folderId) {
    const db = getDbInstance();
    const transaction = db.transaction(() => {
      // Delete related checkouts
      const checkouts = getRepos().checkout.getByFolderId(folderId);
      checkouts.forEach(c => getRepos().checkout.delete(c.id));
      
      // Delete related disposals
      const disposals = getRepos().disposal.getByFolderId(folderId);
      disposals.forEach(d => getRepos().disposal.delete(d.id));
      
      // Delete folder
      return getRepos().folder.deleteById(folderId);
    });
    
    return transaction();
  },

  getFolders(options = {}) {
    return getRepos().folder.findWithFilters(options);
  },

  getAllFoldersForAnalysis() {
    return getRepos().folder.getAllForAnalysis();
  },

  getFoldersByLocation(location) {
    return getRepos().folder.findByLocation(location);
  },

  // Checkout methods
  getActiveCheckoutsWithFolders() {
    const checkouts = getRepos().checkout.getActiveCheckouts();
    return checkouts.map(checkout => {
      const folder = getRepos().folder.getById(checkout.folderId);
      return {
        ...checkout,
        folder
      };
    });
  },

  // Disposal methods
  getDisposableFolders(filter) {
    const currentYear = new Date().getFullYear();
    const allFolders = getRepos().folder.getAll();
    
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
      
      return true; // all
    });
  },

  // Stats method - delegates to StatsService
  getDashboardStats(filters) {
    const { getStatsService } = require('./src/services/StatsService');
    return getStatsService().getDashboardStats(filters);
  }
};
