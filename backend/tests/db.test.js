// backend/tests/db.test.js
const { describe, it, expect, beforeAll, afterAll, beforeEach } = require('@jest/globals');
const { ALL_DEPARTMENTS } = require('../src/config/constants');

// dbManager'ı dinamik olarak yükleyeceğiz
let dbManager;

describe('dbManager with in-memory DB', () => {

  beforeAll(() => {
    process.env.DB_PATH = ':memory:';
    jest.resetModules(); // Ortam değişkenini okuması için modül önbelleğini sıfırla
    dbManager = require('../dbAdapter');
    dbManager.getDbInstance();
    dbManager.migrate();
  });

  afterAll(() => {
    dbManager.closeDb();
  });

  beforeEach(() => {
    const db = dbManager.getDbInstance();
    // Clear all tables before each test
    db.exec('DELETE FROM folders');
    db.exec('DELETE FROM checkouts');
    db.exec('DELETE FROM disposals');
    db.exec('DELETE FROM configs');
    db.exec('DELETE FROM logs');
    
    // Seed data for consistent tests
    db.transaction(() => {
      const now = Date.now();
      dbManager.setConfig('departments', ALL_DEPARTMENTS);
      dbManager.setConfig('settings', {
        darKlasorGenisligi: 3,
        genisKlasorGenisligi: 5,
      });
      // Seed some data with explicit timestamps for deterministic sorting
      dbManager.insertFolder({ id: 'f1', subject: 'A Test Folder', category: 'İdari', departmentId: 1, fileCode: 'A-1', fileYear: 2022, retentionPeriod: 5, retentionCode: 'A', fileCount: 1, folderType: 'Dar', location: { storageType: 'Kompakt', unit: 1, face: 'A', section: 1, shelf: 1 }, status: 'Arşivde', createdAt: new Date(now - 2000).toISOString() });
      dbManager.insertFolder({ id: 'f2', subject: 'B Medical Folder', category: 'Tıbbi', departmentId: 21, fileCode: 'B-2', fileYear: 2023, retentionPeriod: 10, retentionCode: 'B', fileCount: 1, folderType: 'Geniş', location: { storageType: 'Stand', stand: 1, shelf: 2 }, clinic: 'Cardiology', status: 'Çıkışta', createdAt: new Date(now - 1000).toISOString() });
      dbManager.insertFolder({ id: 'f3', subject: 'C Another Test', category: 'İdari', departmentId: 1, fileCode: 'C-3', fileYear: 2023, retentionPeriod: 5, retentionCode: 'A', fileCount: 1, folderType: 'Dar', location: { storageType: 'Kompakt', unit: 1, face: 'A', section: 1, shelf: 1 }, status: 'Arşivde', createdAt: new Date(now).toISOString() });
      dbManager.insertFolder({ id: 'f4', subject: 'D Checked Out', category: 'İdari', departmentId: 8, fileCode: 'HR-02', fileYear: 2023, retentionPeriod: 5, retentionCode: 'C', fileCount: 1, location: {}, status: 'Çıkışta', createdAt: new Date(now + 1000).toISOString() });
      
      // Consistent checkout data
      dbManager.insert('checkouts', { id: 'c1', folderId: 'f2', status: 'Çıkışta', plannedReturnDate: '2020-01-01' }); // for iadeGecikenCount test
      dbManager.insert('checkouts', { id: 'c2', folderId: 'f4', status: 'Çıkışta', plannedReturnDate: new Date(now + 15 * 24*60*60*1000).toISOString() }); // Not overdue
      
      dbManager.insert('disposals', { id: 'd1', folderId: 'f-disposed' });
    })();
  });

  it('should retrieve a folder correctly', () => {
    const folder = dbManager.getFolderById('f1');
    expect(folder.subject).toBe('A Test Folder');
    expect(folder.location.storageType).toBe('Kompakt');
  });

  it('should update a folder correctly', () => {
    const folder = dbManager.getFolderById('f1');
    const updatedFolderData = { ...folder, subject: 'Updated Subject' };
    dbManager.updateFolder(updatedFolderData);

    const retrieved = dbManager.getFolderById('f1');
    expect(retrieved.subject).toBe('Updated Subject');
  });

  describe('getFolders', () => {
    it('should return all non-disposed folders with pagination', () => {
      const result = dbManager.getFolders({ page: 1, limit: 3, sortBy: 'createdAt', order: 'desc' });
      expect(result.items).toHaveLength(3);
      expect(result.total).toBe(4);
      // sort by createdAt desc (newest first: f4, f3, f2, f1)
      expect(result.items[0].subject).toBe('D Checked Out');
      expect(result.items[1].subject).toBe('C Another Test');
    });

    it('should filter by general search term', () => {
      const result = dbManager.getFolders({ general: 'Medical' });
      expect(result.total).toBe(1);
      expect(result.items[0].subject).toBe('B Medical Folder');
    });
    
    it('should filter by category', () => {
      const result = dbManager.getFolders({ category: 'Tıbbi' });
      expect(result.total).toBe(1);
      expect(result.items[0].id).toBe('f2');
    });

    it('should filter by year range', () => {
      const result = dbManager.getFolders({ startYear: '2023', endYear: '2023' });
      expect(result.total).toBe(3);
      const subjects = result.items.map(f => f.subject);
      expect(subjects).toContain('B Medical Folder');
      expect(subjects).toContain('C Another Test');
      expect(subjects).toContain('D Checked Out');
    });

     it('should sort by subject ascending', () => {
      const result = dbManager.getFolders({ sortBy: 'subject', order: 'asc' });
      expect(result.total).toBe(4);
      expect(result.items[0].subject).toBe('A Test Folder');
      expect(result.items[1].subject).toBe('B Medical Folder');
      expect(result.items[2].subject).toBe('C Another Test');
    });
  });

  describe('getDashboardStats', () => {
      it('should calculate stats correctly', () => {
          const stats = dbManager.getDashboardStats({ treemapFilter: 'all', yearFilter: 'all' });
          expect(stats.totalFolders).toBe(4);
          expect(stats.tibbiCount).toBe(1);
          expect(stats.idariCount).toBe(3);
          expect(stats.arsivDisindaCount).toBe(2); // Based on folder status (f2, f4)
          expect(stats.iadeGecikenCount).toBe(1); // Based on checkouts table (c1)
          expect(stats.imhaEdilenCount).toBe(0); // No folders with status='İmha'
          // fileYear + retentionPeriod + 1 = currentYear
          // f1: 2022+5+1=2028 (no)
          // f2: 2023+10+1=2034 (no)
          // f3: 2023+5+1=2029 (no)
          // f4: 2023+5+1=2029 (no)
          expect(stats.buYilImhaEdilenecekCount).toBe(0);
          expect(stats.gelecekYilImhaEdilenecekCount).toBe(0); // currentYear + 1
          expect(stats.imhaSuresiGecenCount).toBe(0); // < currentYear
      });
  });
});