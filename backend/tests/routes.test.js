// @ts-nocheck
const request = require('supertest');
const express = require('express');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');

// Set JWT_SECRET for tests before importing authMiddleware
process.env.JWT_SECRET = 'test-secret-key-for-unit-tests-minimum-32-characters-long';

const { JWT_SECRET } = require('../src/middleware/authMiddleware');

// These will be initialized in beforeAll after modules are reset
let apiRoutes;
let dbManager;
let resolveBackupFolder;
let token;

const app = express();
app.use(express.json());

describe('API Routes Integration Tests', () => {
  const testDbPath = path.join(__dirname, 'test-api.db');
  
  beforeAll(() => {
    process.env.DB_PATH = testDbPath;
    jest.resetModules(); // This is key to ensure modules use the new DB path
    
    // Generate token for tests
    token = jwt.sign({ id: 999, username: 'test_admin', role: 'admin' }, JWT_SECRET);

    // Require modules AFTER resetting cache and setting env var
    apiRoutes = require('../src/routes');
    dbManager = require('../dbAdapter');
    const { getBackupService } = require('../src/services/BackupService');
    resolveBackupFolder = () => getBackupService().resolveBackupFolder();

    // Apply routes to app instance with Auth Middleware simulation or actual implementation
    // Since we are testing integration, we should use the actual middleware if possible, 
    // or we can manually mount it here for the test app if server.js logic isn't fully replicated.
    // However, server.js mounts it. Here we construct a fresh app.
    // We must manually mount the middleware here to match server.js behavior
    const { verifyToken } = require('../src/middleware/authMiddleware');
    app.use('/api', verifyToken, apiRoutes);
    
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
    dbManager.insertFolder({ id: 'f1', subject: 'Finance Report 2022', category: 'İdari', departmentId: 1, fileCode: 'FIN-01', fileYear: 2022, retentionPeriod: 5, retentionCode: 'A', fileCount: 1, folderType: 'Dar', location: {}, status: 'Arşivde' });
    dbManager.insertFolder({ id: 'f2', subject: 'Medical Records 2023', category: 'Tıbbi', departmentId: 21, fileCode: 'MED-01', fileYear: 2023, retentionPeriod: 5, retentionCode: 'B', fileCount: 1, folderType: 'Dar', clinic: 'Cardiology', location: {}, status: 'Arşivde' });
    dbManager.insertFolder({ id: 'f3', subject: 'HR Policies', category: 'İdari', departmentId: 8, fileCode: 'HR-01', fileYear: 2023, retentionPeriod: 5, retentionCode: 'A', fileCount: 1, folderType: 'Dar', location: {}, status: 'Arşivde' });
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
      const createRes = await request(app)
        .post('/api/folders')
        .set('Authorization', `Bearer ${token}`)
        .send(newFolder);
        
      if (createRes.statusCode !== 201) {
          process.stderr.write(`Create Failed: ${createRes.statusCode} ${JSON.stringify(createRes.body, null, 2)}\n`);
      }
      expect(createRes.statusCode).toBe(201);
      const createdId = createRes.body.id;
      expect(createdId).toBeDefined();

      // 2. Retrieve to confirm creation
      const getRes = await request(app)
        .get(`/api/folders/${createdId}`)
        .set('Authorization', `Bearer ${token}`);
      expect(getRes.statusCode).toBe(200);
      expect(getRes.body.subject).toBe('Brand New Folder');

      // 3. Update
      const updateRes = await request(app)
        .put(`/api/folders/${createdId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ ...getRes.body, subject: 'Updated Folder Title' });
      expect(updateRes.statusCode).toBe(200);
      expect(updateRes.body.subject).toBe('Updated Folder Title');

      // 4. Delete
      const deleteRes = await request(app)
        .delete(`/api/folders/${createdId}`)
        .set('Authorization', `Bearer ${token}`);
      expect(deleteRes.statusCode).toBe(204);
      
      // 5. Retrieve again to confirm deletion
      const finalGetRes = await request(app)
        .get(`/api/folders/${createdId}`)
        .set('Authorization', `Bearer ${token}`);
      expect(finalGetRes.statusCode).toBe(404);
    });

    it('should paginate results correctly', async () => {
        const res = await request(app)
          .get('/api/folders?page=1&limit=2&sortBy=subject&order=asc')
          .set('Authorization', `Bearer ${token}`);
        expect(res.statusCode).toBe(200);
        expect(res.body.folders).toHaveLength(2);
        expect(res.body.total).toBe(3);
        expect(res.body.folders[0].subject).toBe('Finance Report 2022');
        expect(res.body.folders[1].subject).toBe('HR Policies');
    });

    it('should filter results with a general query', async () => {
        const res = await request(app)
          .get('/api/folders?general=Medical')
          .set('Authorization', `Bearer ${token}`);
        expect(res.statusCode).toBe(200);
        expect(res.body.folders).toHaveLength(1);
        expect(res.body.folders[0].subject).toBe('Medical Records 2023');
    });
  });

  describe('Dashboard Stats (/api/dashboard-stats)', () => {
      it('should return dashboard statistics', async () => {
          const res = await request(app)
            .get('/api/stats/dashboard')
            .set('Authorization', `Bearer ${token}`);
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
      // Create a dummy backup file (.zip to match BackupService filter)
      const backupFolder = resolveBackupFolder();
      fs.writeFileSync(path.join(backupFolder, 'test-backup.zip'), 'mock backup data');

        const res = await request(app)
          .get('/api/backups')
          .set('Authorization', `Bearer ${token}`);
        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body.backups)).toBe(true);
        expect(res.body.backups.length).toBeGreaterThanOrEqual(1);
        expect(res.body.backups.some(f => f.filename === 'test-backup.zip')).toBe(true);
    });
  });
});