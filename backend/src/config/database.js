/**
 * Database Configuration
 * Centralized database path and connection settings
 */

const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const isDev = process.env.NODE_ENV !== 'production';

/**
 * Ensure environment defaults are set
 */
function ensureEnvDefaults() {
  if (!process.env.DB_PATH) {
    process.env.DB_PATH = path.join(__dirname, '..', '..', 'arsiv.db');
  }
  if (!process.env.USER_DATA_PATH) {
    process.env.USER_DATA_PATH = path.join(__dirname, '..', '..');
  }
  if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = 'development';
  }
}

/**
 * Create empty database file if it doesn't exist
 */
function ensureDbFileExists(dbPath) {
  if (!fs.existsSync(dbPath)) {
    try {
      new Database(dbPath).close();
      if (isDev) {
        console.log('[DB INIT] Yeni boş veritabanı oluşturuldu:', dbPath);
      }
    } catch (err) {
      console.error('[DB INIT] Veritabanı oluşturulamadı:', err);
      throw err;
    }
  }
}

/**
 * Get database path from environment or use default
 */
function getDbPath() {
  return process.env.DB_PATH || path.join(__dirname, '..', '..', 'arsiv.db');
}

module.exports = {
  ensureEnvDefaults,
  ensureDbFileExists,
  getDbPath,
  isDev
};
