/**
 * Config Repository
 * Handles configuration key-value storage
 */

const { getDbInstance } = require('../connection');
const logger = require('../../utils/logger');

class ConfigRepository {
  constructor() {
    this.tableName = 'configs';
    this.db = getDbInstance();
  }

  getDb() {
    if (!this.db || !this.db.open) {
      this.db = getDbInstance();
    }
    return this.db;
  }

  get(key) {
    try {
      const db = this.getDb();
      const row = db.prepare('SELECT value FROM configs WHERE key = ?').get(key);
      return row ? JSON.parse(row.value) : null;
    } catch (error) {
      logger.error('[CONFIG_REPO] get error:', { error, key });
      return null;
    }
  }

  set(key, value) {
    try {
      const db = this.getDb();
      const jsonValue = JSON.stringify(value);
      db.prepare('INSERT OR REPLACE INTO configs (key, value) VALUES (?, ?)').run(key, jsonValue);
      return true;
    } catch (error) {
      logger.error('[CONFIG_REPO] set error:', { error, key });
      throw error;
    }
  }

  getAll() {
    try {
      const db = this.getDb();
      const rows = db.prepare('SELECT key, value FROM configs').all();
      const configs = {};
      rows.forEach(row => {
        configs[row.key] = JSON.parse(row.value);
      });
      return configs;
    } catch (error) {
      logger.error('[CONFIG_REPO] getAll error:', { error });
      return {};
    }
  }
}

module.exports = ConfigRepository;
