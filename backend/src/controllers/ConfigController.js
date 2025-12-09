/**
 * Config Controller
 * Handles configuration operations
 */

const { getRepositories } = require('../database/repositories');
const { sseBroadcast } = require('../utils/sse');
const { clearAutoBackupState } = require('../services/BackupSchedulerService');
const logger = require('../utils/logger');

const configController = {
  /**
   * GET /api/all-data
   * Get all configs and data including logs, checkouts, disposals
   */
  async getAllData(req, res, next) {
    try {
      const repos = getRepositories();
      const settings = repos.config.get('settings');
      const departments = repos.config.get('departments');
      const storageStructure = repos.config.get('storageStructure');
      
      // Son işlemler için logs, checkouts ve disposals'ı da getir
      const logs = repos.log.getAll();
      const checkouts = repos.checkout.getAll();
      const disposals = repos.disposal.getAll();

      res.json({
        settings: settings || {},
        departments: departments || [],
        storageStructure: storageStructure || {},
        logs: logs || [],
        checkouts: checkouts || [],
        disposals: disposals || []
      });
    } catch (error) {
      logger.error('[CONFIG CONTROLLER] Get all data failed:', error);
      next(error);
    }
  },

  /**
   * POST /api/save-configs
   * Save multiple configs
   */
  async saveConfigs(req, res, next) {
    try {
      const repos = getRepositories();
      const { settings, departments, storageStructure } = req.body;
      
      if (settings) {
        repos.config.set('settings', settings);
        clearAutoBackupState();
      }
      
      if (departments) {
        repos.config.set('departments', departments);
        sseBroadcast('departments_updated', { 
          departments,
          ts: new Date()
        });
      }
      
      if (storageStructure) {
        repos.config.set('storageStructure', storageStructure);
        sseBroadcast('storage_structure_updated', { 
          storageStructure,
          ts: new Date()
        });
      }
      
      res.json({ message: 'Konfigürasyon kaydedildi!' });
    } catch (error) {
      logger.error('[CONFIG CONTROLLER] Save configs failed:', error);
      next(error);
    }
  }
};

module.exports = configController;
