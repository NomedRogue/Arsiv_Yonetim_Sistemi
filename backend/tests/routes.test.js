const request = require('supertest');
const express = require('express');
const path = require('path');
const fs = require('fs');

// These will be initialized in beforeAll after modules are reset
let apiRoutes;
let dbManager;
let resolveBackupFolder;

const app = express();
app.use(express.json());

describe('API Routes Integration Tests', () => {
  const testDbPath = path.join(__dirname, 'test-api.db');
  
  beforeAll(() => {
    process.env.DB_PATH = testDbPath;
    jest.resetModules(); // This is key to ensure modules use the new DB path
    
    // Require modules AFTER resetting cache and setting env var
    apiRoutes = require('../routes');
    dbManager = require('../db');
    resolveBackupFolder = require('../backup').resolveBackupFolder;

    // Apply routes to app instance
    app.use('/api', apiRoutes);
    
    // Initialize DB
    const db = dbManager.getDbInstance();
    dbManager.migrate();
  });

  beforeEach(() => {
    // Clear all tables before each test
    const db = dbManager.getDbInstance();
    db.exec('DELETE FROM folders');
    db.exec('DELETE FROM checkouts');
    db.exec('DELETE FROM disposals');
    db.exec('DELETE FROM configs');
    db.exec('DELETE FROM logs');

    // Seed data for consistent tests
    dbManager.insertFolder({ id: 'f1', subject: 'Finance Report 2022', category: 'İdari', departmentId: 1, fileCode: 'FIN-01', fileYear: 2022, location: {} });
    dbManager.insertFolder({ id: 'f2', subject: 'Medical Records 2023', category: 'Tıbbi', departmentId: 21, fileCode: 'MED-01', fileYear: 2023, clinic: 'Cardiology', location: {} });
    dbManager.insertFolder({ id: 'f3', subject: 'HR Policies', category: 'İdari', departmentId: 8, fileCode: 'HR-01', fileYear: 2023, location: {} });
  });

  afterAll(() => {
    dbManager.closeDb();
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    // Clean up env var to not affect other test suites if Jest runs them in same process
    delete process.env.DB_PATH;
  });


  describe('Folders Endpoint (/api/folders)', () => {
    it('should create a folder, retrieve it, update it, and then delete it', async () => {
      const newFolder = {
        subject: 'Brand New Folder',
        category: 'İdari',
        departmentId: 1,
        fileCode: 'NEW-001',
        retentionPeriod: 5,
        retentionCode: 'A',
        fileYear: 2024,
        fileCount: 1,
        folderType: 'Dar',
        location: { storageType: 'Kompakt', unit: 1, face: 'A', section: 1, shelf: 1 },
      };

      // 1. Create
      const createRes = await request(app).post('/api/folders').send(newFolder);
      expect(createRes.statusCode).toBe(201);
      const createdId = createRes.body.id;
      expect(createdId).toBeDefined();

      // 2. Retrieve to confirm creation
      const getRes = await request(app).get(`/api/folders/${createdId}`);
      expect(getRes.statusCode).toBe(200);
      expect(getRes.body.subject).toBe('Brand New Folder');

      // 3. Update
      const updateRes = await request(app).put(`/api/folders/${createdId}`).send({ ...getRes.body, subject: 'Updated Folder Title' });
      expect(updateRes.statusCode).toBe(200);
      expect(updateRes.body.subject).toBe('Updated Folder Title');

      // 4. Delete
      const deleteRes = await request(app).delete(`/api/folders/${createdId}`);
      expect(deleteRes.statusCode).toBe(204);
      
      // 5. Retrieve again to confirm deletion
      const finalGetRes = await request(app).get(`/api/folders/${createdId}`);
      expect(finalGetRes.statusCode).toBe(404);
    });

    it('should paginate results correctly', async () => {
        const res = await request(app).get('/api/folders?page=1&limit=2&sortBy=subject&order=asc');
        expect(res.statusCode).toBe(200);
        expect(res.body.folders).toHaveLength(2);
        expect(res.body.total).toBe(3);
        expect(res.body.folders[0].subject).toBe('Finance Report 2022');
        expect(res.body.folders[1].subject).toBe('HR Policies');
    });

    it('should filter results with a general query', async () => {
        const res = await request(app).get('/api/folders?general=Medical');
        expect(res.statusCode).toBe(200);
        expect(res.body.folders).toHaveLength(1);
        expect(res.body.folders[0].subject).toBe('Medical Records 2023');
    });
  });

  describe('Dashboard Stats (/api/dashboard-stats)', () => {
      it('should return dashboard statistics', async () => {
          const res = await request(app).get('/api/dashboard-stats');
          expect(res.statusCode).toBe(200);
          expect(res.body.totalFolders).toBe(3);
          expect(res.body.tibbiCount).toBe(1);
          expect(res.body.idariCount).toBe(2);
      });
  });
  
  describe('Backup Endpoints', () => {
      beforeEach(() => {
          // Mock settings for backup folder
          const backupFolder = path.join(__dirname, 'test-backups');
          if (!fs.existsSync(backupFolder)) fs.mkdirSync(backupFolder);
          dbManager.setConfig('settings', { yedeklemeKlasoru: backupFolder });
      });

      afterEach(() => {
          const backupFolder = resolveBackupFolder();
          if (fs.existsSync(backupFolder)) {
              fs.rmSync(backupFolder, { recursive: true, force: true });
          }
      });

    it('should list backup files', async () => {
      // Create a dummy backup file
      const backupFolder = resolveBackupFolder();
      fs.writeFileSync(path.join(backupFolder, 'test.db'), 'data');

        const res = await request(app).get('/api/list-backups');
        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body.backups)).toBe(true);
        expect(res.body.backups.length).toBeGreaterThanOrEqual(1);
        expect(res.body.backups.some(f => f.filename === 'test.db')).toBe(true);
    });
  });
});