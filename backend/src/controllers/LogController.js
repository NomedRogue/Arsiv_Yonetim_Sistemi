/**
 * Log Controller
 * Handles logging operations
 */

const { getRepositories } = require('../database/repositories');
const logger = require('../utils/logger');

const logController = {
  /**
   * POST /api/logs
   * Add log entry
   */
  async addLog(req, res, next) {
    try {
      const repos = getRepositories();
      await repos.log.addLog(req.body);
      res.status(201).json({ message: 'Log eklendi.' });
    } catch (error) {
      logger.error('[LOG CONTROLLER] Add log failed:', error);
      next(error);
    }
  }
};

module.exports = logController;
