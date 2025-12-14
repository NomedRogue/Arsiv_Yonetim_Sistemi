const { getRepositories } = require('../database/repositories');
const logger = require('../utils/logger');

class AuditService {
  constructor() {
    this.repo = null;
  }

  getRepo() {
    if (!this.repo) {
      this.repo = getRepositories().audit;
    }
    return this.repo;
  }

  /**
   * Log a business action
   * @param {string} action - Action name (e.g. 'USER_LOGIN', 'FOLDER_DELETE')
   * @param {string} username - Username of the actor
   * @param {object} details - Additional details
   * @param {string} ip - IP address (optional)
   */
  async log(action, username, details = {}, ip = null) {
    try {
      const repo = this.getRepo();
      if (repo) {
        // AuditRepository.add signature: add(action, username, details, ip)
        repo.add(action, username, details, ip);
      }

      // Also log to file for redundancy
      logger.info(`[AUDIT] ${action} by ${username}`, details);
    } catch (error) {
      // Audit logging should not fail the main request, but we log the error
      logger.error('[AUDIT_SERVICE] Failed to log action:', error);
    }
  }
}

module.exports = new AuditService();
