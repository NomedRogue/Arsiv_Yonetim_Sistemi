/**
 * Database Connection Manager
 * Singleton pattern for database connection
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');
const { getDbPath } = require('../config/database');

let dbInstance = null;

const SCHEMA_VERSION = 2; // Excel support için version 2

/**
 * Ensure database tables exist with proper schema
 */
function ensureTables(db) {
  logger.info('[DB] Tablo yapısı kontrol ediliyor...');
  db.pragma('journal_mode = WAL');
  
  // Önce temel tabloları oluştur
  db.exec(`
    CREATE TABLE IF NOT EXISTS configs   ( key TEXT PRIMARY KEY, value TEXT );
    CREATE TABLE IF NOT EXISTS folders   ( 
      id TEXT PRIMARY KEY, category TEXT, departmentId INTEGER, clinic TEXT, unitCode TEXT, fileCode TEXT, subject TEXT, 
      specialInfo TEXT, retentionPeriod INTEGER, retentionCode TEXT, fileYear INTEGER, fileCount INTEGER, folderType TEXT,
      pdfPath TEXT, excelPath TEXT, locationStorageType TEXT, locationUnit INTEGER, locationFace TEXT, locationSection INTEGER, 
      locationShelf INTEGER, locationStand INTEGER, status TEXT, createdAt TEXT, updatedAt TEXT 
    );
    CREATE TABLE IF NOT EXISTS checkouts ( id  TEXT PRIMARY KEY, data  TEXT );
    CREATE TABLE IF NOT EXISTS disposals ( id  TEXT PRIMARY KEY, data  TEXT );
    CREATE TABLE IF NOT EXISTS logs      ( id  TEXT PRIMARY KEY, data  TEXT );
  `);
  
  // Index'ler oluştur - performans için kritik
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_folders_category ON folders(category);
    CREATE INDEX IF NOT EXISTS idx_folders_status ON folders(status);
    CREATE INDEX IF NOT EXISTS idx_folders_departmentId ON folders(departmentId);
    CREATE INDEX IF NOT EXISTS idx_folders_fileYear ON folders(fileYear);
    CREATE INDEX IF NOT EXISTS idx_folders_locationStorageType ON folders(locationStorageType);
    CREATE INDEX IF NOT EXISTS idx_folders_composite ON folders(status, category, departmentId);
  `);
  
  logger.info('[DB] Tablo yapısı kontrol edildi ve index\'ler oluşturuldu.');
}

/**
 * Run database migrations
 */
function migrate(db) {
  try {
    logger.info('[DB] Veritabanı migration başlatılıyor...');
    
    const versionRow = db.prepare("SELECT value FROM configs WHERE key = 'schema_version'").get();
    const currentVersion = versionRow ? Number(JSON.parse(versionRow.value)) : 0;
    
    logger.info(`[DB] Mevcut şema versiyonu: ${currentVersion}, Hedef: ${SCHEMA_VERSION}`);

    if (currentVersion < 1) {
      logger.info('[DB MIGRATION] Versiyon 1 çalıştırılıyor...');
      // Migration logic burada (şimdilik mevcut yapıyı koruyoruz)
    }

    if (currentVersion < 2) {
      logger.info('[DB MIGRATION] Versiyon 2 çalıştırılıyor (Excel support)...');
      // Excel sütunu zaten var, sadece version güncelle
      db.prepare("INSERT OR REPLACE INTO configs (key, value) VALUES ('schema_version', ?)").run(JSON.stringify(SCHEMA_VERSION));
    }
    
    logger.info('[DB] Migration başarıyla tamamlandı.');
  } catch (e) {
    logger.error('[MIGRATION FAILED]', { error: e });
    throw new Error('Veritabanı geçişi başarısız oldu.');
  }
}

/**
 * Get database instance (singleton)
 */
function getDbInstance() {
  if (dbInstance && dbInstance.open) {
    return dbInstance;
  }

  const DB_FILE = getDbPath();
  
  logger.info(`[DB] Veritabanı bağlantısı kuruluyor: ${DB_FILE}`);
  
  try {
    dbInstance = new Database(DB_FILE, {
      verbose: process.env.NODE_ENV !== 'production' ? console.log : null
    });
    
    // Performance and reliability pragmas
    dbInstance.pragma('busy_timeout = 5000'); // Wait 5 seconds if database is locked
    dbInstance.pragma('journal_mode = WAL');  // Write-Ahead Logging for better concurrency
    dbInstance.pragma('synchronous = NORMAL'); // Balance between safety and speed
    
    ensureTables(dbInstance);
    migrate(dbInstance);
    
    logger.info('[DB] Veritabanı bağlantısı başarıyla kuruldu.');
    return dbInstance;
  } catch (error) {
    logger.error('[DB] Veritabanı bağlantısı kurulamadı:', { error });
    throw error;
  }
}

/**
 * Close database connection
 */
function closeDb() {
  if (dbInstance && dbInstance.open) {
    logger.info('Veritabanı bağlantısı kapatılıyor...');
    dbInstance.close();
    dbInstance = null;
  }
}

/**
 * Reconnect database
 */
function reconnectDb() {
  closeDb();
  return getDbInstance();
}

/**
 * Execute a function within a database transaction
 * Automatically commits on success, rolls back on error
 * @param {Function} fn - Function to execute within transaction
 * @returns {any} - Result of the function
 */
function withTransaction(fn) {
  const db = getDbInstance();
  
  return db.transaction(() => {
    return fn(db);
  })();
}

/**
 * Execute an async-like function within a database transaction
 * Note: better-sqlite3 is synchronous, but this wrapper provides consistent API
 * @param {Function} fn - Function to execute within transaction
 * @returns {Promise<any>} - Result wrapped in Promise
 */
async function withTransactionAsync(fn) {
  try {
    const result = withTransaction(fn);
    return result;
  } catch (error) {
    logger.error('[DB TRANSACTION] Transaction failed:', { error });
    throw error;
  }
}

module.exports = {
  getDbInstance,
  closeDb,
  reconnectDb,
  withTransaction,
  withTransactionAsync
};
