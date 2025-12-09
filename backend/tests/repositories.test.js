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
    // Just call getDbInstance - it will initialize the database automatically
    const { getDbInstance } = require('../src/database/repositories');
    getDbInstance();
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

        const id1 = checkoutRepo.create(activeCheckout);
        const id2 = checkoutRepo.create(returnedCheckout);

        const result = checkoutRepo.getActiveCheckouts();

        expect(result).toHaveLength(1);
        expect(result[0].status).toBe('Çıkışta');
        expect(result[0].id).toBe(id1);
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

        checkoutRepo.create(checkout1);
        checkoutRepo.create(checkout2);

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

        checkoutRepo.create(overdueCheckout);

        const result = checkoutRepo.getOverdueCheckouts();

        expect(result).toHaveLength(1);
        expect(new Date(result[0].plannedReturnDate)).toBeLessThan(new Date());
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

        disposalRepo.create(disposal);

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

        const id = disposalRepo.create(disposal);
        const retrieved = disposalRepo.getById(id);

        expect(retrieved.folderId).toBe(disposal.folderId);
        expect(retrieved.reason).toBe(disposal.reason);
        expect(retrieved.disposalDate).toBeInstanceOf(Date);
        expect(retrieved.originalFolderData).toEqual(disposal.originalFolderData);
      });
    });
  });
});
