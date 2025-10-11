const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3'); // Used for backup operations only
const dbManager = require('./db');
const { sseBroadcast } = require('./sse');
const { resolveBackupFolder, performBackupToFolder, getDbInfo } = require('./backup');
const { clearAutoBackupState } = require('./backupScheduler');
const { getUserDataPath, ensureDirExists } = require('./fileHelper');
const logger = require('./logger');

const router = express.Router();

// Root health check endpoint for wait-on
router.get('/', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Arşiv Yönetim Sistemi Backend',
    timestamp: new Date().toISOString()
  });
});

// Health check endpoint
router.get('/health', async (req, res) => {
  try {
    // Database bağlantısını test et
    const db = await dbManager.getDbInstance();
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      database: 'connected'
    });
  } catch (error) {
    logger.error('[HEALTH] Database connection failed:', error);
    res.status(500).json({ 
      status: 'error', 
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ---------- Helpers ----------
async function resolvePdfFolder() {
  let folderPath = '';
  // NOTE: Her çağrıldığında ayarları yeniden oku.
  const settings = await dbManager.getConfig('settings');
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
  
  logger.info('[PDF FOLDER] Resolved path:', folderPath);
  ensureDirExists(folderPath);
  logger.info('[PDF FOLDER] Directory ensured:', folderPath);
  return folderPath;
}

const validateDbSchema = async (dbPath) => {
  const Database = require('better-sqlite3');
  
  try {
    const testDb = new Database(dbPath, { readonly: true });
    
    const requiredTables = ['configs', 'folders', 'checkouts', 'disposals', 'logs'];
    const tables = testDb.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    const tableNames = tables.map(t => t.name);
    const hasAllTables = requiredTables.every(t => tableNames.includes(t));
    
    testDb.close();
    return hasAllTables;
  } catch (e) {
    logger.error('DB schema validation failed during open', { message: e.message, stack: e.stack });
    return false;
  }
};

// ---------- Multer: PDF depolama ----------
// Lazy initialization to ensure USER_DATA_PATH is set
let upload = null;
function getUploadMiddleware() {
  if (!upload) {
    const storage = multer.diskStorage({
      destination: async (req, file, cb) => {
        try {
          const uploadPath = await resolvePdfFolder();
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
    upload = multer({ storage });
  }
  return upload;
}

// ---------- Multer: DB restore (temp) ----------
// Lazy initialization to ensure USER_DATA_PATH is set
let uploadDb = null;
function getUploadDbMiddleware() {
  if (!uploadDb) {
    const tmpDir = getUserDataPath('tmp');
    ensureDirExists(tmpDir);
    uploadDb = multer({ dest: tmpDir });
  }
  return uploadDb;
}

// ---------- Routes ----------
router.get('/health', (_req, res) => res.json({ ok: true }));

// PDF endpoints
router.post('/upload-pdf', (req, res, next) => {
  const uploadMiddleware = getUploadMiddleware();
  uploadMiddleware.single('pdf')(req, res, (err) => {
    if (err) return next(err);
    
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
});

router.get('/serve-pdf/:filename', async (req, res, next) => {
  try {
    const filename = path.basename(req.params.filename);
    const filePath = path.join(await resolvePdfFolder(), filename);

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

router.delete('/delete-pdf/:filename', async (req, res, next) => {
  try {
    const filename = path.basename(req.params.filename);
    const filePath = path.join(await resolvePdfFolder(), filename);

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
router.post('/save-configs', async (req, res, next) => {
  try {
    const { settings, departments, storageStructure } = req.body;
    
    if (settings)         await dbManager.setConfig('settings', settings);
    if (departments)      await dbManager.setConfig('departments', departments);
    if (storageStructure) await dbManager.setConfig('storageStructure', storageStructure);
    
    if (settings) {
      // Ayarlar değiştiğinde otomatik yedekleme durumunu sıfırla ki
      // yeni zamanlamayı doğru uygulasın.
      clearAutoBackupState();
    }

    // Birim güncellendiğinde SSE broadcast ile client'ları bilgilendir
    if (departments) {
      sseBroadcast('departments_updated', { 
        departments,
        ts: new Date()
      });
    }

    // Storage structure güncellendiğinde SSE broadcast
    if (storageStructure) {
      sseBroadcast('storage_structure_updated', { 
        storageStructure,
        ts: new Date()
      });
    }
    
    res.json({ message: 'Konfigürasyon kaydedildi!' });
  } catch (err) {
    next(err);
  }
});

// LOGS
router.post('/logs', async (req, res, next) => {
  try {
    await dbManager.addLog(req.body);
    res.status(201).json({ message: 'Log eklendi.' });
  } catch (err) {
    next(err);
  }
});

// FOLDERS
// IMPORTANT: Specific routes must come before parameterized routes.
// GET /folders (paginated, searchable, sortable)
router.get('/folders', async (req, res, next) => {
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

        const result = await dbManager.getFolders(cleanOptions);
        
        // Frontend ile uyumlu format için 'items' → 'folders' 
        res.json({
            folders: result.items,
            total: result.total,
            page: result.page,
            limit: result.limit
        });
    } catch (err) {
        next(err);
    }
});

// GET disposable folders
router.get('/folders/disposable', async (req, res, next) => {
  try {
    const { filter } = req.query; // thisYear, nextYear, overdue
    const folders = await dbManager.getDisposableFolders(filter);
    res.json(folders);
  } catch (err) {
    next(err);
  }
});

router.post('/folders', (req, res, next) => {
  try {
    const newFolder = dbManager.insertFolder(req.body);
    
    // SSE broadcast: Yeni klasör eklendi
    sseBroadcast('folder_created', { 
      folder: newFolder,
      ts: new Date()
    });
    
    res.status(201).json(newFolder);
  } catch (err) {
    next(err);
  }
});

router.put('/folders/:id', (req, res, next) => {
  try {
    const updatedFolder = dbManager.updateFolder(req.body);
    
    // SSE broadcast: Klasör güncellendi
    sseBroadcast('folder_updated', { 
      folder: updatedFolder,
      ts: new Date()
    });
    
    res.json(updatedFolder);
  } catch (err) {
    next(err);
  }
});

router.get('/folders/:id', async (req, res, next) => {
  try {
    const folder = await dbManager.getFolderById(req.params.id);
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
    
    // SSE broadcast: Klasör silindi
    sseBroadcast('folder_deleted', { 
      folderId: req.params.id,
      ts: new Date()
    });
    
    res.status(204).send();
  } catch(err) {
    next(err);
  }
});

// CHECKOUTS
router.post('/checkouts', (req, res, next) => {
  try {
    const newCheckout = dbManager.insert('checkouts', req.body);
    
    // SSE broadcast: Klasör çıkışı yapıldı
    sseBroadcast('checkout_created', { 
      checkout: newCheckout,
      ts: new Date()
    });
    
    res.status(201).json(newCheckout);
  } catch (err) {
    next(err);
  }
});

router.put('/checkouts/:id', (req, res, next) => {
  try {
    const updatedCheckout = dbManager.update('checkouts', req.body);
    
    // SSE broadcast: Çıkış bilgisi güncellendi
    sseBroadcast('checkout_updated', { 
      checkout: updatedCheckout,
      ts: new Date()
    });
    
    res.json(updatedCheckout);
  } catch(err) {
    next(err);
  }
});

// GET active checkouts with folder data
router.get('/checkouts/active', async (req, res, next) => {
  try {
    const data = await dbManager.getActiveCheckoutsWithFolders();
    res.json(data);
  } catch (err) {
    next(err);
  }
});


// DISPOSALS
router.get('/disposals', (req, res, next) => {
  try {
    const disposals = dbManager.getList('disposals');
    res.json(disposals);
  } catch (err) {
    next(err);
  }
});

router.post('/disposals', (req, res, next) => {
  try {
    const newDisposal = dbManager.insert('disposals', req.body);
    
    // Klasör bilgisini al ve log oluştur
    const folder = dbManager.getById('folders', req.body.folderId);
    if (folder) {
      const logDetails = `Klasör imha edildi: ${folder.fileCode || 'Kod Yok'} - ${folder.subject || 'Konu Yok'} (${folder.fileYear || 'Yıl Yok'})`;
      dbManager.addLog({ 
        type: 'dispose', 
        details: logDetails 
      });
    }
    
    // SSE broadcast: İmha edildi, tüm sayfaları güncelle
    sseBroadcast('folder_updated', { 
      folderId: req.body.folderId,
      status: 'İmha',
      ts: new Date()
    });
    
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

router.post('/restore-db', (req, res, next) => {
  const uploadDbMiddleware = getUploadDbMiddleware();
  uploadDbMiddleware.single('dbfile')(req, res, async (err) => {
    if (err) return next(err);
    
    try {
      if (!req.file) return res.status(400).json({ error: 'No file' });

      if (!(await validateDbSchema(req.file.path))) {
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
});

router.get('/list-backups', (req, res, next) => {
  try {
    const folder = resolveBackupFolder();
    if (!folder || !fs.existsSync(folder)) return res.json({ backups: [], folder: folder || '' });

    const files = fs
      .readdirSync(folder)
      .filter((f) => f.toLowerCase().endsWith('.db'))
      .map((f) => {
        const full = path.join(folder, f);
        const st = fs.statSync(full);
        return { filename: f, size: st.size, mtimeMs: st.mtimeMs, iso: new Date(st.mtimeMs).toISOString() };
      })
      .sort((a, b) => b.mtimeMs - a.mtimeMs);

    res.json({ backups: files, folder });
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

    if (!(await validateDbSchema(backupPath))) {
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
      
      // SSE broadcast for deleted backup
      sseBroadcast('backup_delete', { 
        filename: safeFilename,
        ts: new Date()
      });
      
      res.json({ ok: true, message: `Backup file '${safeFilename}' deleted.` });
    } else {
      res.status(404).json({ error: 'Backup file not found.' });
    }
  } catch (e) {
    next(e);
  }
});

// Server-Sent Events for real-time updates
router.get('/events', (req, res, next) => {
  try {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Cache-Control');

    // Send initial connection message
    res.write('data: {"type":"connected","message":"SSE connection established"}\n\n');

    // Keep connection alive with periodic heartbeat
    const heartbeat = setInterval(() => {
      res.write('data: {"type":"heartbeat","timestamp":"' + new Date().toISOString() + '"}\n\n');
    }, 30000);

    // Handle client disconnect
    req.on('close', () => {
      clearInterval(heartbeat);
    });

    req.on('aborted', () => {
      clearInterval(heartbeat);
    });

  } catch(err) {
    next(err);
  }
});

router.get('/dashboard-stats', async (req, res, next) => {
  try {
    const filters = {
      treemapFilter: req.query.treemapFilter || 'all',
      yearFilter: req.query.yearFilter || 'last12',
    };
    const stats = await dbManager.getDashboardStats(filters);
    res.json(stats);
  } catch(err) {
    next(err);
  }
});

router.get('/all-folders-for-analysis', async (req, res, next) => {
  try {
    const folders = await dbManager.getAllFoldersForAnalysis();
    res.json(folders);
  } catch (err) {
    next(err);
  }
});

router.post('/folders-by-location', async (req, res, next) => {
  try {
    const location = req.body;
    if (!location || !location.storageType) {
      return res.status(400).json({ error: 'Location data is required.' });
    }
    const folders = await dbManager.getFoldersByLocation(location);
    res.json(folders);
  } catch (err) {
    next(err);
  }
});

// GET /all-data (Kept for settings/departments/etc but without folders)
router.get('/all-data', async (req, res) => {
  const settings = await dbManager.getConfig('settings');
  const departments = await dbManager.getConfig('departments');
  const storageStructure = await dbManager.getConfig('storageStructure');
  const logs = await dbManager.getList('logs');
  const checkouts = await dbManager.getList('checkouts');
  const disposals = await dbManager.getList('disposals');

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