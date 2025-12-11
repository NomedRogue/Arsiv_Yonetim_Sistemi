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
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      createdAt TEXT,
      updatedAt TEXT
    );
  `);
  
  // Index'ler oluştur - performans için kritik
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_folders_category ON folders(category);
    CREATE INDEX IF NOT EXISTS idx_folders_status ON folders(status);
    CREATE INDEX IF NOT EXISTS idx_folders_departmentId ON folders(departmentId);
    CREATE INDEX IF NOT EXISTS idx_folders_fileYear ON folders(fileYear);
    CREATE INDEX IF NOT EXISTS idx_folders_locationStorageType ON folders(locationStorageType);
    CREATE INDEX IF NOT EXISTS idx_folders_composite ON folders(status, category, departmentId);

    -- JSON indexes for checkouts table (for optimized queries)
    -- JSON indexes disabled for testing compatibility
    -- CREATE INDEX IF NOT EXISTS idx_checkouts_status ON checkouts(json_extract(data, '$.status'));
    -- CREATE INDEX IF NOT EXISTS idx_checkouts_folderId ON checkouts(json_extract(data, '$.folderId'));
    -- CREATE INDEX IF NOT EXISTS idx_disposals_folderId ON disposals(json_extract(data, '$.folderId'));

    -- FTS5 Virtual Table for Fast Search
    CREATE VIRTUAL TABLE IF NOT EXISTS folders_fts USING fts5(
        id UNINDEXED, 
        fileCode, 
        subject, 
        clinic, 
        specialInfo, 
        unitCode,
        tokenize='porter'
    );

    -- Triggers to sync folders with folders_fts
    CREATE TRIGGER IF NOT EXISTS folders_ai AFTER INSERT ON folders BEGIN
      INSERT INTO folders_fts(id, fileCode, subject, clinic, specialInfo, unitCode)
      VALUES (new.id, new.fileCode, new.subject, new.clinic, new.specialInfo, new.unitCode);
    END;

    CREATE TRIGGER IF NOT EXISTS folders_ad AFTER DELETE ON folders BEGIN
      DELETE FROM folders_fts WHERE id = old.id;
    END;

    CREATE TRIGGER IF NOT EXISTS folders_au AFTER UPDATE ON folders BEGIN
      DELETE FROM folders_fts WHERE id = old.id;
      INSERT INTO folders_fts(id, fileCode, subject, clinic, specialInfo, unitCode)
      VALUES (new.id, new.fileCode, new.subject, new.clinic, new.specialInfo, new.unitCode);
    END;
  `);
  
  // Re-populate FTS if empty (migration helper)
  // This is a simple check; for production might need more robust migration
  const ftsCount = db.prepare('SELECT count(*) as c FROM folders_fts').get().c;
  if (ftsCount === 0) {
      const folderCount = db.prepare('SELECT count(*) as c FROM folders').get().c;
      if (folderCount > 0) {
          logger.info('[DB] FTS tablosu boş, mevcut verilerle dolduruluyor...');
          db.exec(`
            INSERT INTO folders_fts(id, fileCode, subject, clinic, specialInfo, unitCode)
            SELECT id, fileCode, subject, clinic, specialInfo, unitCode FROM folders;
          `);
      }
  }
  
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
    
    // ===== TURKISH COLLATION SUPPORT =====
    // Note: Custom collation requires native binding support which might be missing.
    // We rely on custom LOWER function for generic Turkish support.

    
    // ===== TURKISH CHARACTER SUPPORT =====
    // Register custom LOWER function for Turkish characters
    dbInstance.function('LOWER', (text) => {
      if (!text) return text;
      return text
        .replace(/İ/g, 'i')
        .replace(/I/g, 'ı')
        .replace(/Ğ/g, 'ğ')
        .replace(/Ü/g, 'ü')
        .replace(/Ş/g, 'ş')
        .replace(/Ö/g, 'ö')
        .replace(/Ç/g, 'ç')
        .toLowerCase();
    });
    
    // Register custom UPPER function for Turkish characters
    dbInstance.function('UPPER', (text) => {
      if (!text) return text;
      return text
        .replace(/i/g, 'İ')
        .replace(/ı/g, 'I')
        .replace(/ğ/g, 'Ğ')
        .replace(/ü/g, 'Ü')
        .replace(/ş/g, 'Ş')
        .replace(/ö/g, 'Ö')
        .replace(/ç/g, 'Ç')
        .toUpperCase();
    });
    
    logger.info('[DB] Türkçe karakter desteği eklendi (Custom LOWER/UPPER functions)');
    // ===== END TURKISH CHARACTER SUPPORT =====
    
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
