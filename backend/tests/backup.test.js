// Mock dependencies BEFORE they are imported by any module. Jest hoists these calls.
jest.mock('../dbAdapter');
jest.mock('../src/utils/sse');

const { describe, it, expect, beforeEach, afterEach } = require('@jest/globals');
const fs = require('fs');
const path = require('path');
const os = require('os');

// These will be re-required in beforeEach after resetting modules
let dbManager;
let backupUtils;

describe('Backup Utilities', () => {
  const tempDir = path.join(os.tmpdir(), `backup-test-${Date.now()}`);
  const mockUserDataPath = path.join(tempDir, 'userData');

  beforeEach(() => {
    fs.mkdirSync(mockUserDataPath, { recursive: true });
    process.env.USER_DATA_PATH = mockUserDataPath;

    // Reset modules to ensure fileHelper picks up the new USER_DATA_PATH
    jest.resetModules();

    dbManager = require('../dbAdapter');
    backupUtils = require('../backup');
    
    // Setup a default mock behavior for getDbInstance().backup()
    dbManager.getDbInstance.mockReturnValue({
        backup: jest.fn().mockImplementation((dest) => {
            fs.writeFileSync(dest, ''); // Simulate creating a backup file
            return Promise.resolve();
        })
    });
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
    delete process.env.USER_DATA_PATH;
  });

  describe('resolveBackupFolder', () => {
    it('should use the path from settings if available', () => {
      const settingsPath = path.join(tempDir, 'settingsBackup');
      dbManager.getConfig.mockReturnValue({ yedeklemeKlasoru: settingsPath });
      
      const { resolveBackupFolder } = backupUtils;
      const resolvedPath = resolveBackupFolder();
      
      expect(dbManager.getConfig).toHaveBeenCalledWith('settings');
      expect(resolvedPath).toBe(settingsPath);
      expect(fs.existsSync(settingsPath)).toBe(true);
    });

    it('should use the default user data path if settings path is not defined', () => {
      dbManager.getConfig.mockReturnValue({}); // No yedeklemeKlasoru
      const expectedPath = path.join(mockUserDataPath, 'Backups');

      const { resolveBackupFolder } = backupUtils;
      const resolvedPath = resolveBackupFolder();
      
      expect(dbManager.getConfig).toHaveBeenCalledWith('settings');
      expect(resolvedPath).toBe(expectedPath);
      expect(fs.existsSync(expectedPath)).toBe(true);
    });
  });

  describe('cleanupOldBackups', () => {
    const backupDir = path.join(tempDir, 'backups');

    beforeEach(() => {
      fs.mkdirSync(backupDir, { recursive: true });
      // Create some dummy files with different modification times
      const now = Date.now();
      fs.writeFileSync(path.join(backupDir, 'backup_3.db'), ''); // newest
      fs.utimesSync(path.join(backupDir, 'backup_3.db'), new Date(now), new Date(now));

      fs.writeFileSync(path.join(backupDir, 'backup_2.db'), ''); // middle
      fs.utimesSync(path.join(backupDir, 'backup_2.db'), new Date(now - 1000), new Date(now - 1000));
      
      fs.writeFileSync(path.join(backupDir, 'backup_1.db'), ''); // oldest
      fs.utimesSync(path.join(backupDir, 'backup_1.db'), new Date(now - 2000), new Date(now - 2000));
      
      fs.writeFileSync(path.join(backupDir, 'not_a_backup.txt'), '');
    });

    it('should delete the oldest backup file if count exceeds limit', async () => {
      await backupUtils.cleanupOldBackups(backupDir, 2);

      expect(fs.existsSync(path.join(backupDir, 'backup_3.db'))).toBe(true); // newest
      expect(fs.existsSync(path.join(backupDir, 'backup_2.db'))).toBe(true); // middle
      expect(fs.existsSync(path.join(backupDir, 'backup_1.db'))).toBe(false); // oldest, deleted
      expect(fs.existsSync(path.join(backupDir, 'not_a_backup.txt'))).toBe(true); // should be ignored
    });

    it('should not delete any files if count is not exceeded', async () => {
      await backupUtils.cleanupOldBackups(backupDir, 3);
      expect(fs.readdirSync(backupDir)).toHaveLength(4); // 3 db files + 1 txt
    });

    it('should handle an empty directory without errors', async () => {
        const emptyDir = path.join(tempDir, 'empty');
        fs.mkdirSync(emptyDir);
        await expect(backupUtils.cleanupOldBackups(emptyDir, 2)).resolves.not.toThrow();
    });
  });
});