/**
 * Backup Service
 * Business logic for database backup operations
 */

const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const archiver = require('archiver');
const AdmZip = require('adm-zip');
const { getDbInstance } = require('../database/connection');
const { getRepositories } = require('../database/repositories');
const { getUserDataPath, ensureDirExists, validateFilePath } = require('../utils/fileHelper');
const logger = require('../utils/logger');

class BackupService {
  constructor() {
    this.repos = getRepositories();
  }

  /**
   * Resolve backup folder from settings or default
   */
  resolveBackupFolder() {
    let folderPath = '';
    const settings = this.repos.config.get('settings');
    
    if (settings?.yedeklemeKlasoru && typeof settings.yedeklemeKlasoru === 'string') {
      folderPath = settings.yedeklemeKlasoru.trim();
    }

    if (!folderPath) {
      folderPath = getUserDataPath('Backups');
    }

    ensureDirExists(folderPath);
    return folderPath;
  }

  /**
   * Cleanup old backups, keeping only the N most recent
   */
  async cleanupOldBackups(folder, keepN) {
    try {
      if (!fs.existsSync(folder)) return;
      logger.info(`[BACKUP_SERVICE] Cleaning ${folder}, keeping last ${keepN} backups`);

      const filenames = await fsPromises.readdir(folder);
      const backupFiles = filenames.filter(
        (f) => f.toLowerCase().endsWith('.zip') || f.toLowerCase().endsWith('.db')
      );

      if (backupFiles.length <= keepN) {
        logger.info(`[BACKUP_SERVICE] No cleanup needed (${backupFiles.length} <= ${keepN})`);
        return;
      }

      const filesWithStats = await Promise.all(
        backupFiles.map(async (f) => {
          const full = path.join(folder, f);
          try {
            const stat = await fsPromises.stat(full);
            return { name: f, full, mtimeMs: stat.mtimeMs };
          } catch (e) {
            logger.error('[BACKUP_SERVICE] Stat error:', { error: e, file: f });
            return null;
          }
        })
      );

      const valid = filesWithStats.filter((x) => x !== null);
      valid.sort((a, b) => b.mtimeMs - a.mtimeMs);

      const toDelete = valid.slice(keepN);
      for (const f of toDelete) {
        try {
          await fsPromises.unlink(f.full);
          logger.info(`[BACKUP_SERVICE] Deleted old backup: ${f.name}`);
        } catch (e) {
          logger.error('[BACKUP_SERVICE] Delete error:', { error: e, file: f.name });
        }
      }

      logger.info(`[BACKUP_SERVICE] Cleanup complete: deleted ${toDelete.length} files`);
    } catch (error) {
      logger.error('[BACKUP_SERVICE] Cleanup error:', { error, folder });
      throw error;
    }
  }

  /**
   * Create backup file
   */
  async createBackup(type = 'Manuel') {
    try {
      const backupFolder = this.resolveBackupFolder();
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
      const backupName = `backup_${timestamp}_${Date.now()}`;
      const backupPath = path.join(backupFolder, `${backupName}.zip`);

      logger.info('[BACKUP_SERVICE] Starting backup:', { type, path: backupPath });

      // Get database path
      const db = getDbInstance();
      const dbPath = db.name;

      // Create backup using WAL checkpoint
      const checkpointBackupPath = path.join(backupFolder, `${backupName}.db`);
      
      // Checkpoint the database to ensure all changes are in main file
      db.pragma('wal_checkpoint(TRUNCATE)');
      
      // Copy database file
      await fsPromises.copyFile(dbPath, checkpointBackupPath);

      // Create zip archive
      const output = fs.createWriteStream(backupPath);
      const archive = archiver('zip', { zlib: { level: 9 } });

      return new Promise((resolve, reject) => {
        output.on('close', async () => {
          try {
            // Calculate checksum
            const fileBuffer = await fsPromises.readFile(backupPath);
            const checksum = crypto.createHash('sha256').update(fileBuffer).digest('hex');
            const size = archive.pointer();

            // Delete temporary DB file
            await fsPromises.unlink(checkpointBackupPath);

            // Log backup
            this.repos.log.addLog({
              type: 'backup',
              details: `${type} yedekleme oluşturuldu: ${backupName}.zip (${(size / 1024 / 1024).toFixed(2)} MB)`
            });

            // Cleanup old backups
            const settings = this.repos.config.get('settings') || {};
            const keepBackups = settings.backupRetentionCount || 5;
            await this.cleanupOldBackups(backupFolder, keepBackups);

            logger.info('[BACKUP_SERVICE] Backup created:', {
              path: backupPath,
              size,
              checksum: checksum.substring(0, 8)
            });

            resolve({
              path: backupPath,
              name: `${backupName}.zip`,
              size,
              checksum,
              timestamp: new Date(),
              type
            });
          } catch (error) {
            logger.error('[BACKUP_SERVICE] Post-backup processing error:', { error });
            reject(error);
          }
        });

        archive.on('error', (error) => {
          logger.error('[BACKUP_SERVICE] Archive error:', { error });
          reject(error);
        });

        archive.pipe(output);
        
        // Add Database file
        archive.file(checkpointBackupPath, { name: path.basename(checkpointBackupPath) });
        
        // Add PDFs folder if exists
        const pdfPath = getUserDataPath('PDFs');
        if (fs.existsSync(pdfPath)) {
          archive.directory(pdfPath, 'PDFs');
        }
        
        // Add Excels folder if exists
        const excelPath = getUserDataPath('Excels');
        if (fs.existsSync(excelPath)) {
          archive.directory(excelPath, 'Excels');
        }

        archive.finalize();
      });
    } catch (error) {
      logger.error('[BACKUP_SERVICE] Create backup error:', { error, type });
      throw error;
    }
  }

  /**
   * List all backups
   */
  async listBackups() {
    try {
      const backupFolder = this.resolveBackupFolder();
      
      if (!fs.existsSync(backupFolder)) {
        return [];
      }

      const filenames = await fsPromises.readdir(backupFolder);
      const backupFiles = filenames.filter((f) => f.toLowerCase().endsWith('.zip'));

      const backups = await Promise.all(
        backupFiles.map(async (f) => {
          const full = path.join(backupFolder, f);
          try {
            const stat = await fsPromises.stat(full);
            return {
              name: f,
              path: full,
              size: stat.size,
              created: stat.mtime,
              modified: stat.mtime
            };
          } catch (e) {
            logger.error('[BACKUP_SERVICE] Stat error:', { error: e, file: f });
            return null;
          }
        })
      );

      return backups.filter((b) => b !== null).sort((a, b) => b.created - a.created);
    } catch (error) {
      logger.error('[BACKUP_SERVICE] List backups error:', { error });
      throw error;
    }
  }

  /**
   * Delete backup file
   */
  async deleteBackup(filename) {
    try {
      const backupFolder = this.resolveBackupFolder();
      
      // Path traversal validation
      const validation = validateFilePath(filename, backupFolder);
      if (!validation.isValid) {
        throw new Error(validation.error || 'Geçersiz dosya adı');
      }
      
      const backupPath = validation.safePath;

      if (!fs.existsSync(backupPath)) {
        throw new Error('Yedek dosyası bulunamadı');
      }

      await fsPromises.unlink(backupPath);

      this.repos.log.addLog({
        type: 'backup_delete',
        details: `Yedek dosyası silindi: ${filename}`
      });

      logger.info('[BACKUP_SERVICE] Backup deleted:', { filename });
      return { success: true };
    } catch (error) {
      logger.error('[BACKUP_SERVICE] Delete backup error:', { error, filename });
      throw error;
    }
  }

  /**
   * Restore database from backup
   */
  async restoreBackup(filename) {
    try {
      const backupFolder = this.resolveBackupFolder();
      
      // Path traversal validation
      const validation = validateFilePath(filename, backupFolder);
      if (!validation.isValid) {
        throw new Error(validation.error || 'Geçersiz dosya adı');
      }
      
      const backupPath = validation.safePath;

      if (!fs.existsSync(backupPath)) {
        throw new Error('Yedek dosyası bulunamadı');
      }

      logger.info('[BACKUP_SERVICE] Restoring from backup:', { filename });

      // Get current database instance and path
      const db = getDbInstance();
      const dbPath = db.name;
      
      // Create temp directory for extraction
      const tempDir = path.join(path.dirname(backupPath), 'restore_temp_' + Date.now());
      await fsPromises.mkdir(tempDir, { recursive: true });

      try {
        // Extract zip file
        const zip = new AdmZip(backupPath);
        zip.extractAllTo(tempDir, true);

        // Find the .db file in extracted contents
        const extractedFiles = await fsPromises.readdir(tempDir);
        const dbFile = extractedFiles.find(f => f.endsWith('.db'));
        
        if (!dbFile) {
          throw new Error('Yedek dosyasında veritabanı bulunamadı');
        }

        const extractedDbPath = path.join(tempDir, dbFile);

        // Verify the extracted database is valid
        const testDb = require('better-sqlite3')(extractedDbPath, { readonly: true });
        const testResult = testDb.prepare('SELECT 1 as ok').get();
        testDb.close();
        
        if (!testResult || testResult.ok !== 1) {
          throw new Error('Yedek dosyası geçersiz veritabanı içeriyor');
        }

        // Checkpoint current database to ensure WAL is flushed
        db.pragma('wal_checkpoint(TRUNCATE)');
        
        // Close current database connection
        db.close();

        // Backup current database before replacing (safety)
        const currentBackupPath = dbPath + '.before_restore_' + Date.now();
        await fsPromises.copyFile(dbPath, currentBackupPath);

        // Replace current database with restored one
        await fsPromises.copyFile(extractedDbPath, dbPath);

        // Delete WAL and SHM files if they exist
        const walPath = dbPath + '-wal';
        const shmPath = dbPath + '-shm';
        if (fs.existsSync(walPath)) await fsPromises.unlink(walPath);
        if (fs.existsSync(shmPath)) await fsPromises.unlink(shmPath);

        // Restore PDF and Excel files if they exist in backup
        const pdfFolderInBackup = path.join(tempDir, 'PDFs');
        const excelFolderInBackup = path.join(tempDir, 'Excels');
        const pdfDestination = getUserDataPath('PDFs');
        const excelDestination = getUserDataPath('Excels');

        // Clear existing PDF and Excel folders
        if (fs.existsSync(pdfDestination)) {
          await fsPromises.rm(pdfDestination, { recursive: true, force: true });
        }
        if (fs.existsSync(excelDestination)) {
          await fsPromises.rm(excelDestination, { recursive: true, force: true });
        }

        // Recreate folders
        ensureDirExists(pdfDestination);
        ensureDirExists(excelDestination);

        // Restore PDFs if they exist in backup
        if (fs.existsSync(pdfFolderInBackup)) {
          const pdfFiles = await fsPromises.readdir(pdfFolderInBackup);
          for (const file of pdfFiles) {
            const srcPath = path.join(pdfFolderInBackup, file);
            const destPath = path.join(pdfDestination, file);
            await fsPromises.copyFile(srcPath, destPath);
          }
          logger.info(`[BACKUP_SERVICE] Restored ${pdfFiles.length} PDF files`);
        }

        // Restore Excels if they exist in backup
        if (fs.existsSync(excelFolderInBackup)) {
          const excelFiles = await fsPromises.readdir(excelFolderInBackup);
          for (const file of excelFiles) {
            const srcPath = path.join(excelFolderInBackup, file);
            const destPath = path.join(excelDestination, file);
            await fsPromises.copyFile(srcPath, destPath);
          }
          logger.info(`[BACKUP_SERVICE] Restored ${excelFiles.length} Excel files`);
        }

        // Reinitialize database connection
        const { reconnectDb } = require('../database/connection');
        reconnectDb();

        // Reinitialize repositories with new connection
        const { resetRepositories } = require('../database/repositories');
        if (typeof resetRepositories === 'function') {
          resetRepositories();
        }
        this.repos = getRepositories();

        // Log restore operation
        this.repos.log.addLog({
          type: 'restore',
          details: `Veritabanı yedekten geri yüklendi: ${filename}`
        });

        logger.info('[BACKUP_SERVICE] Restore completed:', { filename });

        // Cleanup temp directory
        await fsPromises.rm(tempDir, { recursive: true, force: true });

        // Delete safety backup after successful restore
        await fsPromises.unlink(currentBackupPath);

        return { 
          success: true, 
          message: 'Yedek başarıyla geri yüklendi. Sayfa yenilenecek.' 
        };

      } catch (innerError) {
        // Cleanup temp directory on error
        if (fs.existsSync(tempDir)) {
          await fsPromises.rm(tempDir, { recursive: true, force: true });
        }
        throw innerError;
      }

    } catch (error) {
      logger.error('[BACKUP_SERVICE] Restore backup error:', { error, filename });
      throw error;
    }
  }
}

// Singleton instance
let instance = null;

function getBackupService() {
  if (!instance) {
    instance = new BackupService();
  }
  return instance;
}

module.exports = { BackupService, getBackupService };
