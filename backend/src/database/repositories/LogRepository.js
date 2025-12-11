/**
 * Log Repository
 * Handles system logs with JSON data storage
 */

const BaseRepository = require('./BaseRepository');
const logger = require('../../utils/logger');

class LogRepository extends BaseRepository {
  constructor() {
    super('logs');
  }

  serialize(log) {
    return {
      id: log.id || `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      data: JSON.stringify({
        type: log.type,
        details: log.details,
        timestamp: log.timestamp || new Date().toISOString()
      })
    };
  }

  deserialize(row) {
    const data = JSON.parse(row.data);
    return {
      id: row.id,
      type: data.type,
      details: data.details,
      timestamp: new Date(data.timestamp)
    };
  }

  /**
   * Add new log entry
   */
  addLog(logData) {
    const log = {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: logData.type,
      details: logData.details,
      timestamp: new Date()
    };
    
    return this.insert(log);
  }

  /**
   * Get logs sorted by timestamp (newest first)
   */
  getAll() {
    try {
      const db = this.getDb();
      const rows = db.prepare(`SELECT * FROM ${this.tableName} ORDER BY id DESC`).all();
      return rows.map(row => this.deserialize(row));
    } catch (error) {
      logger.error('[LOG_REPO] getAll error:', { error });
      throw error;
    }
  }

  /**
   * Get recent logs (limited)
   */
  getRecent(limit = 100) {
    try {
      const db = this.getDb();
      const rows = db.prepare(`SELECT * FROM ${this.tableName} ORDER BY id DESC LIMIT ?`).all(limit);
      return rows.map(row => this.deserialize(row));
    } catch (error) {
      logger.error('[LOG_REPO] getRecent error:', { error, limit });
      throw error;
    }
  }

  /**
   * Get logs by type
   */
  getByType(type, limit = 50) {
    try {
      const db = this.getDb();
      const rows = db.prepare(`SELECT * FROM ${this.tableName} ORDER BY id DESC`).all();
      const filtered = rows
        .map(row => this.deserialize(row))
        .filter(log => log.type === type)
        .slice(0, limit);
      
      return filtered;
    } catch (error) {
      logger.error('[LOG_REPO] getByType error:', { error, type });
      throw error;
    }
  }
}

module.exports = LogRepository;
