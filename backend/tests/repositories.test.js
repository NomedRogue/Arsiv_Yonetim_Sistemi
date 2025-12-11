/**
 * Repository Tests
 * Tests for optimized repository methods with SQL json_extract
 */

const path = require('path');
const CheckoutRepository = require('../src/database/repositories/CheckoutRepository');
const DisposalRepository = require('../src/database/repositories/DisposalRepository');

describe('Repository Tests', () => {
  const testDbPath = path.join(__dirname, 'test-repositories.db');

  beforeAll(() => {
    process.env.DB_PATH = testDbPath;
  });

  beforeEach(() => {
    jest.resetModules();
    // Initialize database
    const { getDbInstance } = require('../src/database/connection');
    const db = getDbInstance();
    
    // Clean tables to ensure isolation between tests
    db.exec('DELETE FROM checkouts');
    db.exec('DELETE FROM disposals');
  });

  afterEach(() => {
    try {
      const { closeDb } = require('../src/database/connection');
      closeDb();
    } catch (e) {
      // Ignore
    }
  });

  afterAll(() => {
    // Cleanup test database files
    const fs = require('fs');
    if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
    const walPath = testDbPath + '-wal';
    const shmPath = testDbPath + '-shm';
    if (fs.existsSync(walPath)) fs.unlinkSync(walPath);
    if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath);
  });

  describe('CheckoutRepository', () => {
    let checkoutRepo;

    beforeEach(() => {
      checkoutRepo = new CheckoutRepository();
    });

    describe('getActiveCheckouts', () => {
      it('should return only active checkouts', () => {
        // Create test checkouts
        const activeCheckout = {
          folderId: 'folder1',
          checkoutType: 'Tam',
          personName: 'Test',
          personSurname: 'User',
          reason: 'Test reason',
          checkoutDate: new Date().toISOString(),
          plannedReturnDate: new Date(Date.now() + 86400000).toISOString(),
          status: 'Çıkışta'
        };

        const returnedCheckout = {
          folderId: 'folder2',
          checkoutType: 'Tam',
          personName: 'Test2',
          personSurname: 'User2',
          reason: 'Test reason 2',
          checkoutDate: new Date().toISOString(),
          plannedReturnDate: new Date(Date.now() + 86400000).toISOString(),
          actualReturnDate: new Date().toISOString(),
          status: 'İade Edildi'
        };

        const created1 = checkoutRepo.insert(activeCheckout);
        
        // Return checkout (update status)
        const returnedCheckoutWithId = { ...returnedCheckout };
        const created2 = checkoutRepo.insert(returnedCheckout);

        const result = checkoutRepo.getActiveCheckouts();

        expect(result).toHaveLength(1);
        expect(result[0].status).toBe('Çıkışta');
        expect(result[0].id).toBe(created1.id);
      });

      it('should return empty array if no active checkouts', () => {
        const result = checkoutRepo.getActiveCheckouts();
        expect(result).toEqual([]);
      });
    });

    describe('getByFolderId', () => {
      it('should return checkouts for specific folder', () => {
        const folderId = 'test-folder-123';
        
        const checkout1 = {
          folderId: folderId,
          checkoutType: 'Tam',
          personName: 'Test',
          personSurname: 'User',
          checkoutDate: new Date().toISOString(),
          plannedReturnDate: new Date().toISOString(),
          status: 'Çıkışta'
        };

        const checkout2 = {
          folderId: 'other-folder',
          checkoutType: 'Tam',
          personName: 'Test2',
          personSurname: 'User2',
          checkoutDate: new Date().toISOString(),
          plannedReturnDate: new Date().toISOString(),
          status: 'Çıkışta'
        };

        checkoutRepo.insert(checkout1);
        checkoutRepo.insert(checkout2);

        const result = checkoutRepo.getByFolderId(folderId);

        expect(result).toHaveLength(1);
        expect(result[0].folderId).toBe(folderId);
      });

      it('should return empty array if no checkouts for folder', () => {
        const result = checkoutRepo.getByFolderId('nonexistent');
        expect(result).toEqual([]);
      });
    });

    describe('getOverdueCheckouts', () => {
      it('should return checkouts past planned return date', () => {
        const pastDate = new Date(Date.now() - 86400000).toISOString(); // Yesterday
        
        const overdueCheckout = {
          folderId: 'folder1',
          checkoutType: 'Tam',
          personName: 'Test',
          personSurname: 'User',
          checkoutDate: new Date(Date.now() - 172800000).toISOString(),
          plannedReturnDate: pastDate,
          status: 'Çıkışta'
        };

        checkoutRepo.insert(overdueCheckout);

        const result = checkoutRepo.getOverdueCheckouts();

        expect(result).toHaveLength(1);
        expect(new Date(result[0].plannedReturnDate).getTime()).toBeLessThan(new Date().getTime());
      });
    });
  });

  describe('DisposalRepository', () => {
    let disposalRepo;

    beforeEach(() => {
      disposalRepo = new DisposalRepository();
    });

    describe('getByFolderId', () => {
      it('should return disposals for specific folder', () => {
        const folderId = 'test-folder-456';
        
        const disposal = {
          folderId: folderId,
          disposalDate: new Date().toISOString(),
          reason: 'İmha süresi doldu',
          originalFolderData: { id: folderId, subject: 'Test Folder' }
        };

        disposalRepo.insert(disposal);

        const result = disposalRepo.getByFolderId(folderId);

        expect(result).toHaveLength(1);
        expect(result[0].folderId).toBe(folderId);
      });

      it('should return empty array if no disposals found', () => {
        const result = disposalRepo.getByFolderId('nonexistent');
        expect(result).toEqual([]);
      });
    });

    describe('serialization', () => {
      it('should correctly serialize and deserialize disposal data', () => {
        const disposal = {
          folderId: 'folder-123',
          disposalDate: new Date().toISOString(),
          reason: 'Test reason',
          originalFolderData: { id: 'folder-123', subject: 'Test' }
        };

        const created = disposalRepo.insert(disposal);
        const retrieved = disposalRepo.getById(created.id);

        expect(retrieved.folderId).toBe(disposal.folderId);
        expect(retrieved.reason).toBe(disposal.reason);
        expect(retrieved.disposalDate).toBeInstanceOf(Date);
        expect(retrieved.originalFolderData).toEqual(disposal.originalFolderData);
      });
    });
  });
});
