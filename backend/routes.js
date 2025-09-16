const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const dbManager = require('./db');
const { sseBroadcast } = require('./sse');
const { resolveBackupFolder, performBackupToFolder, getDbInfo } = require('./backup');
const { clearAutoBackupState } = require('./backupScheduler');
const { getUserDataPath, ensureDirExists } = require('./fileHelper');
const logger = require('./logger');

const router = express.Router();

// Health check endpoint
router.get('/health', (req, res) => {
  try {
    // Database bağlantısını test et
    const db = dbManager.getDbInstance();
    const result = db.prepare("SELECT 1 as test").get();
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      database: result ? 'connected' : 'error'
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'error', 
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ---------- Helpers ----------
function resolvePdfFolder() {
  let folderPath = '';
  // NOTE: Her çağrıldığında ayarları yeniden oku.
  const settings = dbManager.getConfig('settings');
  if (
    settings &&
    settings.pdfKayitKlasoru &&
    typeof settings.pdfKayitKlasoru === 'string'
  ) {
    folderPath = settings.pdfKayitKlasoru.trim();
  }

  if (!folderPath) {
    folderPath = getUserDataPath('PDFs');
  }
  
  ensureDirExists(folderPath);
  return folderPath;
}

const validateDbSchema = (dbPath) => {
  let testDb;
  try {
    testDb = new Database(dbPath, { readonly: true });
    const requiredTables = ['configs', 'folders', 'checkouts', 'disposals', 'logs'];
    const tables = testDb.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    const tableNames = tables.map(t => t.name);
    const hasAllTables = requiredTables.every(t => tableNames.includes(t));
    return hasAllTables;
  } catch (e) {
    logger.error('DB schema validation failed during open', { error: e });
    return false;
  } finally {
    if (testDb) testDb.close();
  }
};

// ---------- Multer: PDF depolama ----------
const storage = multer.diskStorage({
  destination(req, file, cb) {
    try {
      const uploadPath = resolvePdfFolder();
      cb(null, uploadPath);
    } catch (error) {
      logger.error('Upload path error:', { error });
      cb(error);
    }
  },
  filename(req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'pdf-' + uniqueSuffix + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

// ---------- Multer: DB restore (temp) ----------
const tmpDir = path.join(__dirname, 'tmp');
fs.mkdirSync(tmpDir, { recursive: true });
const uploadDb = multer({ dest: tmpDir });

// ---------- Routes ----------
router.get('/health', (_req, res) => res.json({ ok: true }));

// PDF endpoints
router.post('/upload-pdf', upload.single('pdf'), (req, res, next) => {
  try {
    if (!req.file) return res.status(400).send('No file uploaded.');

    // Validate file is a PDF by checking magic number
    const buffer = Buffer.alloc(4);
    const fd = fs.openSync(req.file.path, 'r');
    fs.readSync(fd, buffer, 0, 4, 0);
    fs.closeSync(fd);

    if (buffer.toString('utf-8', 0, 4) !== '%PDF') {
      // Not a PDF, delete the file and return error
      fs.unlinkSync(req.file.path);
      const err = new Error('Yalnızca PDF dosyaları yüklenebilir.');
      err.statusCode = 400;
      return next(err);
    }

    res.json({ filename: req.file.filename });
  } catch (err) {
    // If file exists after error, try to clean it up
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupError) {
        logger.error('Failed to cleanup uploaded file after validation error', { error: cleanupError });
      }
    }
    next(err);
  }
});

router.get('/serve-pdf/:filename', (req, res, next) => {
  try {
    const filename = path.basename(req.params.filename);
    const filePath = path.join(resolvePdfFolder(), filename);

    if (fs.existsSync(filePath)) {
      res.contentType('application/pdf');
      res.sendFile(path.resolve(filePath));
    } else {
      res.status(404).send('File not found.');
    }
  } catch (error) {
    next(error);
  }
});

router.delete('/delete-pdf/:filename', (req, res, next) => {
  try {
    const filename = path.basename(req.params.filename);
    const filePath = path.join(resolvePdfFolder(), filename);

    if (fs.existsSync(filePath)) {
      fs.unlink(filePath, (err) => {
        if (err) return next(err);
        res.json({ message: 'File deleted successfully.' });
      });
    } else {
      res.status(200).json({ message: 'File not found, but proceeding.' });
    }
  } catch (error) {
    next(error);
  }
});

// AYARLAR (Settings, Departments, StorageStructure)
router.post('/save-configs', (req, res, next) => {
  try {
    const { settings, departments, storageStructure } = req.body;
    dbManager.getDbInstance().transaction(() => {
      if (settings)         dbManager.setConfig('settings', settings);
      if (departments)      dbManager.setConfig('departments', departments);
      if (storageStructure) dbManager.setConfig('storageStructure', storageStructure);
    })();
    
    if (settings) {
      // Ayarlar değiştiğinde otomatik yedekleme durumunu sıfırla ki
      // yeni zamanlamayı doğru uygulasın.
      clearAutoBackupState();
    }
    
    res.json({ message: 'Konfigürasyon kaydedildi!' });
  } catch (err) {
    next(err);
  }
});

// LOGS
router.post('/logs', (req, res, next) => {
  try {
    dbManager.addLog(req.body);
    res.status(201).json({ message: 'Log eklendi.' });
  } catch (err) {
    next(err);
  }
});

// FOLDERS
// IMPORTANT: Specific routes must come before parameterized routes.
// GET /folders (paginated, searchable, sortable)
router.get('/folders', (req, res, next) => {
    try {
        const options = {
            page: req.query.page ? parseInt(String(req.query.page), 10) : 1,
            limit: req.query.limit ? parseInt(String(req.query.limit), 10) : 20,
            sortBy: req.query.sortBy,
            order: req.query.order,
            general: req.query.general,
            category: req.query.category,
            departmentId: req.query.departmentId,
            clinic: req.query.clinic,
            fileCode: req.query.fileCode,
            subject: req.query.subject,
            specialInfo: req.query.specialInfo,
            startYear: req.query.startYear,
            endYear: req.query.endYear,
            retentionCode: req.query.retentionCode,
        };
        // filter out undefined/null options
        const cleanOptions = Object.fromEntries(Object.entries(options).filter(([_, v]) => v != null && v !== ''));

        const result = dbManager.getFolders(cleanOptions);
        res.json(result);
    } catch (err) {
        next(err);
    }
});

// GET disposable folders
router.get('/folders/disposable', (req, res, next) => {
  try {
    const { filter } = req.query; // thisYear, nextYear, pastYears
    const folders = dbManager.getDisposableFolders(filter);
    res.json(folders);
  } catch (err) {
    next(err);
  }
});

router.post('/folders', (req, res, next) => {
  try {
    const newFolder = dbManager.insertFolder(req.body);
    res.status(201).json(newFolder);
  } catch (err) {
    next(err);
  }
});

router.put('/folders/:id', (req, res, next) => {
  try {
    const updatedFolder = dbManager.updateFolder(req.body);
    res.json(updatedFolder);
  } catch (err) {
    next(err);
  }
});

router.get('/folders/:id', (req, res, next) => {
  try {
    const folder = dbManager.getFolderById(req.params.id);
    if (folder) {
      res.json(folder);
    } else {
      res.status(404).json({ error: { message: 'Klasör bulunamadı' } });
    }
  } catch (err) {
    next(err);
  }
});

router.delete('/folders/:id', (req, res, next) => {
  try {
    dbManager.deleteFolderAndRelations(req.params.id);
    res.status(204).send();
  } catch(err) {
    next(err);
  }
});

// CHECKOUTS
router.post('/checkouts', (req, res, next) => {
  try {
    const newCheckout = dbManager.insert('checkouts', req.body);
    res.status(201).json(newCheckout);
  } catch (err) {
    next(err);
  }
});

router.put('/checkouts/:id', (req, res, next) => {
  try {
    const updatedCheckout = dbManager.update('checkouts', req.body);
    res.json(updatedCheckout);
  } catch(err) {
    next(err);
  }
});

// GET active checkouts with folder data
router.get('/checkouts/active', (req, res, next) => {
  try {
    const data = dbManager.getActiveCheckoutsWithFolders();
    res.json(data);
  } catch (err) {
    next(err);
  }
});


// DISPOSALS
router.post('/disposals', (req, res, next) => {
  try {
    const newDisposal = dbManager.insert('disposals', req.body);
    res.status(201).json(newDisposal);
  } catch (err) {
    next(err);
  }
});

// DB INFO
router.get('/db-info', async (_req, res, next) => {
  try {
    const info = await getDbInfo();
    res.json(info);
  } catch (e) {
    next(e);
  }
});

// YEDEKLEME / GERİ YÜKLEME
router.post('/backup-db-to-folder', async (req, res, next) => {
  try {
    const dest = await performBackupToFolder('manual');
    res.json({ ok: true, path: dest });
  } catch (e) {
    if (e.message.includes('Yedekleme Klasörü tanımlı değil')) {
      e.statusCode = 400;
    }
    next(e);
  }
});

router.post('/restore-db', uploadDb.single('dbfile'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file' });

    if (!validateDbSchema(req.file.path)) {
      fs.unlinkSync(req.file.path);
      const err = new Error('Geçersiz veritabanı dosyası. Şema uyumsuz.');
      err.statusCode = 400;
      return next(err);
    }

    const before = await getDbInfo().catch(() => null);

    const tempDb = new Database(req.file.path, { readonly: true });
    await tempDb.backup(dbManager.DB_FILE);
    tempDb.close();
    fs.unlink(req.file.path, () => {});

    dbManager.reconnectDb();

    const after = await getDbInfo();
    dbManager.addLog({ type: 'restore', details: 'Yüklenen .db dosyasıyla geri yükleme yapıldı.' });
    clearAutoBackupState();
    sseBroadcast('restore', { source: 'upload', ts: new Date() });
    
    res.json({ ok: true, before, after });
  } catch (e) {
    dbManager.reconnectDb();
    next(e);
  }
});

router.get('/list-backups', (req, res, next) => {
  try {
    const folder = resolveBackupFolder();
    if (!folder || !fs.existsSync(folder)) return res.json({ files: [], folder: folder || '' });

    const files = fs
      .readdirSync(folder)
      .filter((f) => f.toLowerCase().endsWith('.db'))
      .map((f) => {
        const full = path.join(folder, f);
        const st = fs.statSync(full);
        return { filename: f, size: st.size, mtimeMs: st.mtimeMs, iso: new Date(st.mtimeMs).toISOString() };
      })
      .sort((a, b) => b.mtimeMs - a.mtimeMs);

    res.json({ files, folder });
  } catch (e) {
    next(e);
  }
});

router.post('/restore-db-from-backup', async (req, res, next) => {
  try {
    let backupPath;
    if (req.body.filename) {
      const backupFolder = resolveBackupFolder();
      if (!backupFolder) throw new Error('Yedekleme klasörü ayarlardan okunamadı.');
      const filename = path.basename(req.body.filename);
      backupPath = path.join(backupFolder, filename);
    }
    
    if (!backupPath || !fs.existsSync(backupPath)) {
      const err = new Error('Yedek dosya yolu eksik veya dosya bulunamadı.');
      err.statusCode = 404;
      return next(err);
    }

    if (!validateDbSchema(backupPath)) {
      const err = new Error('Geçersiz yedek dosyası. Şema uyumsuz.');
      err.statusCode = 400;
      return next(err);
    }

    const before = await getDbInfo().catch(() => null);

    const db = dbManager.getDbInstance();
    if (db && db.open) {
      db.close();
    }
    
    fs.copyFileSync(backupPath, dbManager.DB_FILE);
    
    dbManager.reconnectDb(); 

    const after = await getDbInfo();

    dbManager.addLog({ type: 'restore', details: `Yedekten geri yüklendi: ${path.basename(backupPath)}` });
    clearAutoBackupState();
    sseBroadcast('restore', { 
      source: 'backup',
      filename: path.basename(backupPath),
      ts: new Date()
    });

    res.json({ ok: true, before, after });
  } catch (e) {
    dbManager.reconnectDb();
    next(e);
  }
});

router.delete('/delete-backup/:filename', async (req, res, next) => {
  try {
    const { filename } = req.params;
    if (!filename || typeof filename !== 'string') {
      return res.status(400).json({ error: 'Filename is required.' });
    }
    const safeFilename = path.basename(filename);
    if (safeFilename !== filename) {
        return res.status(400).json({ error: 'Invalid filename.' });
    }
    
    const backupFolder = resolveBackupFolder();
    if (!backupFolder) {
      return res.status(400).json({ error: 'Backup folder is not configured.' });
    }

    const filePath = path.join(backupFolder, safeFilename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      dbManager.addLog({ type: 'backup_delete', details: `Yedek dosyası silindi: ${safeFilename}` });
      res.json({ ok: true, message: `Backup file '${safeFilename}' deleted.` });
    } else {
      res.status(404).json({ error: 'Backup file not found.' });
    }
  } catch (e) {
    next(e);
  }
});

router.get('/dashboard-stats', (req, res, next) => {
  try {
    const filters = {
      treemapFilter: req.query.treemapFilter || 'all',
      yearFilter: req.query.yearFilter || 'last12',
    };
    const stats = dbManager.getDashboardStats(filters);
    res.json(stats);
  } catch(err) {
    next(err);
  }
});

router.get('/all-folders-for-analysis', (req, res, next) => {
  try {
    const folders = dbManager.getAllFoldersForAnalysis();
    res.json(folders);
  } catch (err) {
    next(err);
  }
});

router.post('/folders-by-location', (req, res, next) => {
  try {
    const location = req.body;
    if (!location || !location.storageType) {
      return res.status(400).json({ error: 'Location data is required.' });
    }
    const folders = dbManager.getFoldersByLocation(location);
    res.json(folders);
  } catch (err) {
    next(err);
  }
});

// GET /all-data (Kept for settings/departments/etc but without folders)
router.get('/all-data', (req, res) => {
  const settings = dbManager.getConfig('settings');
  const departments = dbManager.getConfig('departments');
  const storageStructure = dbManager.getConfig('storageStructure');
  const logs = dbManager.getList('logs');
  const checkouts = dbManager.getList('checkouts');
  const disposals = dbManager.getList('disposals');

  res.json({
    settings: settings || undefined,
    departments: departments || undefined,
    storageStructure: storageStructure || undefined,
    logs,
    checkouts,
    disposals
    // NOTE: folders are now excluded from this endpoint
  });
});

module.exports = router;