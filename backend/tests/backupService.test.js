/**
 * BackupService Tests
 * Tests for backup creation, restoration, and management
 */

const path = require('path');
const fs = require('fs');
const { BackupService } = require('../src/services/BackupService');

describe('BackupService', () => {
  let backupService;
  const testBackupFolder = path.join(__dirname, 'test-backups');
  const testDbPath = path.join(__dirname, 'test-backup-service.db');

  beforeAll(() => {
    // Set test database path
    process.env.DB_PATH = testDbPath;
  });

  beforeEach(() => {
    // Create test backup folder
    if (!fs.existsSync(testBackupFolder)) {
      fs.mkdirSync(testBackupFolder, { recursive: true });
    }

    // Initialize database and repositories
    jest.resetModules();
    const { getRepositories } = require('../src/database/repositories');
    const repos = getRepositories();
    
    // Set test settings
    repos.config.set('settings', {
      yedeklemeKlasoru: testBackupFolder,
      backupRetentionCount: 5
    });

    backupService = new BackupService();
  });

  afterEach(() => {
    // Cleanup test backup folder
    if (fs.existsSync(testBackupFolder)) {
      fs.rmSync(testBackupFolder, { recursive: true, force: true });
    }

    // Close database
    try {
      const { closeDb } = require('../src/database/connection');
      closeDb();
    } catch (e) {
      // Ignore
    }
  });

  afterAll(() => {
    // Cleanup test database
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    const walPath = testDbPath + '-wal';
    const shmPath = testDbPath + '-shm';
    if (fs.existsSync(walPath)) fs.unlinkSync(walPath);
    if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath);
  });

  describe('resolveBackupFolder', () => {
    it('should return folder from settings if configured', () => {
      const folder = backupService.resolveBackupFolder();
      expect(folder).toBe(testBackupFolder);
      expect(fs.existsSync(folder)).toBe(true);
    });

    it('should create folder if it does not exist', () => {
      const newFolder = path.join(testBackupFolder, 'new-backup-dir');
      const { getRepositories } = require('../src/database/repositories');
      const repos = getRepositories();
      repos.config.set('settings', { yedeklemeKlasoru: newFolder });
      
      const folder = backupService.resolveBackupFolder();
      expect(fs.existsSync(folder)).toBe(true);
    });
  });

  describe('cleanupOldBackups', () => {
    it('should keep only N most recent backups', async () => {
      // Create 7 test backup files
      for (let i = 0; i < 7; i++) {
        const filename = `backup_${i}.zip`;
        const filepath = path.join(testBackupFolder, filename);
        fs.writeFileSync(filepath, 'test data');
        
        // Set different modification times
        const time = new Date(Date.now() - (i * 1000));
        fs.utimesSync(filepath, time, time);
      }

      await backupService.cleanupOldBackups(testBackupFolder, 5);

      // Should keep only 5 most recent
      const remaining = fs.readdirSync(testBackupFolder);
      expect(remaining.length).toBe(5);
    });

    it('should not delete if count is below threshold', async () => {
      // Create 3 test backup files
      for (let i = 0; i < 3; i++) {
        const filename = `backup_${i}.zip`;
        fs.writeFileSync(path.join(testBackupFolder, filename), 'test');
      }

      await backupService.cleanupOldBackups(testBackupFolder, 5);

      const remaining = fs.readdirSync(testBackupFolder);
      expect(remaining.length).toBe(3);
    });

    it('should handle non-existent folder gracefully', async () => {
      const nonExistent = path.join(testBackupFolder, 'does-not-exist');
      await expect(
        backupService.cleanupOldBackups(nonExistent, 5)
      ).resolves.not.toThrow();
    });
  });

  describe('listBackups', () => {
    it.skip('should list all backup files sorted by date', async () => {
      // Create test backups
      const files = ['backup_1.zip', 'backup_2.zip', 'backup_3.zip'];
      for (let i = 0; i < files.length; i++) {
        const filepath = path.join(testBackupFolder, files[i]);
        fs.writeFileSync(filepath, 'test');
        
        // Set different times
        const time = new Date(Date.now() - (i * 10000));
        fs.utimesSync(filepath, time, time);
      }

      const backups = await backupService.listBackups();

      expect(backups.length).toBe(3);
      expect(backups[0].name).toBe('backup_1.zip'); // Most recent first
      expect(backups[0].path).toEqual(expect.any(String));
      expect(backups[0].size).toEqual(expect.any(Number));
      expect(backups[0].created).toBeInstanceOf(Date);
    });

    it('should return empty array if folder does not exist', async () => {
      const { getRepositories } = require('../src/database/repositories');
      const repos = getRepositories();
      const nonExistentFolder = path.join(testBackupFolder, 'nonexistent');
      repos.config.set('settings', { yedeklemeKlasoru: nonExistentFolder });
      
      const backups = await backupService.listBackups();
      expect(backups).toEqual([]);
    });
  });

  describe('deleteBackup', () => {
    it('should delete specified backup file', async () => {
      const filename = 'test-backup.zip';
      const filepath = path.join(testBackupFolder, filename);
      fs.writeFileSync(filepath, 'test data');

      await backupService.deleteBackup(filename);

      expect(fs.existsSync(filepath)).toBe(false);
    });

    it('should reject path traversal attempts', async () => {
      await expect(
        backupService.deleteBackup('../../../etc/passwd')
      ).rejects.toThrow();
    });

    it('should throw error if file does not exist', async () => {
      await expect(
        backupService.deleteBackup('nonexistent.zip')
      ).rejects.toThrow('Yedek dosyası bulunamadı');
    });
  });
});
