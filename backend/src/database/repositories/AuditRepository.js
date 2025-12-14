/**
 * Audit Repository
 * Handles business logic audit logs
 */

const BaseRepository = require('./BaseRepository');
const logger = require('../../utils/logger');
const { v4: uuidv4 } = require('uuid');

class AuditRepository extends BaseRepository {
  constructor() {
    super('audit_logs');
  }

  /**
   * Add audit log entry
   */
  add(action, username, details, ip) {
    try {
      const entry = {
        id: uuidv4(),
        action,
        username: username || 'system',
        ip: ip || null,
        details: JSON.stringify(details || {}),
        timestamp: new Date().toISOString()
      };

      return this.insert(entry);
    } catch (error) {
      logger.error('[AUDIT_REPO] add error:', { error });
      // Don't throw for audit logs to prevent blocking business logic
      return null;
    }
  }

  /**
   * Get recent audit logs
   */
  getRecent(limit = 100) {
    try {
      const db = this.getDb();
      const rows = db.prepare(`SELECT * FROM ${this.tableName} ORDER BY timestamp DESC LIMIT ?`).all(limit);
      return rows.map(row => ({
        ...row,
        details: JSON.parse(row.details)
      }));
    } catch (error) {
      logger.error('[AUDIT_REPO] getRecent error:', { error });
      return [];
    }
  }

  serialize(item) {
    return item;
  }

  deserialize(row) {
    return {
      ...row,
      details: JSON.parse(row.details)
    };
  }
}

module.exports = AuditRepository;
