// Tüm modüller en başta tanımlanır
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const isDev = process.env.NODE_ENV !== 'production';

// DB dosyası yoksa otomatik oluştur
const dbPath = process.env.DB_PATH || path.join(__dirname, 'arsiv.db');
if (!fs.existsSync(dbPath)) {
  try {
    new Database(dbPath).close();
    if (isDev) console.log('[DB INIT] Yeni boş veritabanı oluşturuldu: ' + dbPath);
  } catch (dbCreateErr) {
    console.error('[DB INIT] Veritabanı oluşturulamadı', dbCreateErr);
  }
}

const express = require('express');
const cors = require('cors');
const { initSse } = require('./sse');
const apiRoutes = require('./routes');
const { startAutoBackupScheduler, initAutoBackupState } = require('./backupScheduler');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const logger = require('./logger');
const dbManager = require('./db');

// --- ENVIRONMENT SETUP ---

// Kritik: Ortam değişkenleri eksikse default değer atanmalı
function ensureEnvDefaults() {
  if (!process.env.DB_PATH) {
    process.env.DB_PATH = path.join(__dirname, 'arsiv.db');
  }
  if (!process.env.USER_DATA_PATH) {
    process.env.USER_DATA_PATH = __dirname;
  }
  if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = 'development';
  }
}
ensureEnvDefaults();

logger.info('[SERVER] Environment setup:', {
  DB_PATH: process.env.DB_PATH,
  USER_DATA_PATH: process.env.USER_DATA_PATH,
  NODE_ENV: process.env.NODE_ENV
});

// --- DB MIGRATION ---

// Sunucu başlamadan önce veritabanı geçişlerini çalıştır.
(async () => {
  try {
    await dbManager.getDbInstance(); // Bu fonksiyon migrationı da çalıştırır
    if (isDev) console.log('[SERVER] Database migration completed');
    logger.info('[DB] Veritabanı şeması başarıyla kontrol edildi/güncellendi.');
  } catch (e) {
    console.error('[SERVER] Database migration FAILED:', e);
    logger.error('[FATAL] Veritabanı geçişi başarısız oldu. Uygulama durduruluyor.', { error: e });
    process.exit(1);
  }
})();

// --- END DB MIGRATION ---

const app = express();

console.log('[SERVER] Setting up CORS...');
const corsOptions = {
  origin: (origin, callback) => {
    // Development: Vite server ve localhost
    // Production: file:// protokolü (origin null olur) ve localhost
    const allowedOrigins = ['http://localhost:5173', 'http://localhost:4173'];
    if (!origin || allowedOrigins.includes(origin) || 
        origin === 'null' || origin?.startsWith('file://')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));

// SSE (Server-Sent Events)
initSse(app);

// Root endpoint for health checks
app.get('/', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Arşiv Yönetim Sistemi Backend',
    timestamp: new Date().toISOString()
  });
});

// API Rotaları
app.use('/api', apiRoutes);

// Production'da static file serving
if (process.env.NODE_ENV === 'production') {
  const staticPath = path.join(__dirname, '..', 'frontend', 'dist');
  
  if (fs.existsSync(staticPath)) {
    app.use(express.static(staticPath));
    
    // SPA fallback - tüm diğer istekleri index.html'e yönlendir
    app.get('*', (req, res) => {
      res.sendFile(path.join(staticPath, 'index.html'));
    });
    logger.info('[STATIC] Serving static files from:', staticPath);
  } else {
    logger.warn('[STATIC] Static path not found:', staticPath);
  }
}

// Otomatik Yedekleme Zamanlayıcısı
initAutoBackupState();
startAutoBackupScheduler();

// PDF ve Backup klasörlerini startup'ta oluştur
const { getUserDataPath, ensureDirExists } = require('./fileHelper');
const pdfPath = getUserDataPath('PDFs');
const backupPath = getUserDataPath('Backups');
const tmpPath = getUserDataPath('tmp');
ensureDirExists(pdfPath);
ensureDirExists(backupPath);
ensureDirExists(tmpPath);
logger.info('[STARTUP] Required directories ensured:', { pdfPath, backupPath, tmpPath });

// 404 handler for unmatched routes
app.use(notFoundHandler);

// Merkezi Hata Yönetimi
app.use(errorHandler);

const PORT = process.env.PORT || 3001;

function startServer() {
  return new Promise((resolve, reject) => {
    const server = app.listen(PORT, '127.0.0.1', () => {
      logger.info(`Backend http://localhost:${PORT} üzerinde çalışıyor...`);
      resolve(server);
    });
    
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        logger.error(`Port ${PORT} already in use. Trying alternative port...`);
        
        // Alternatif port dene
        const altServer = app.listen(0, '127.0.0.1', () => {
          const actualPort = altServer.address().port;
          logger.info(`Backend http://localhost:${actualPort} üzerinde çalışıyor... (alternatif port)`);
          resolve(altServer);
        });
        
        altServer.on('error', (altErr) => {
          console.error('[SERVER] Alternative server failed:', altErr);
          reject(altErr);
        });
      } else {
        console.error('[SERVER] Server startup error:', err);
        logger.error('Server başlatma hatası:', err);
        reject(err);
      }
    });
    
    // Graceful shutdown handlers
    process.on('SIGTERM', () => {
      logger.info('[BACKEND] Received SIGTERM signal. Shutting down gracefully...');
      server.close(() => {
        logger.info('[BACKEND] Server closed.');
        dbManager.closeDb();
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      logger.info('[BACKEND] Received SIGINT signal. Shutting down gracefully...');
      server.close(() => {
        logger.info('[BACKEND] Server closed.');
        dbManager.closeDb();
        process.exit(0);
      });
    });

    // Unhandled errors
    process.on('uncaughtException', (error) => {
      logger.error('[BACKEND] Uncaught Exception:', error);
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('[BACKEND] Unhandled Rejection at:', promise, 'reason:', reason);
    });
  });
}

// Server'ı başlat
console.log('[SERVER] About to call startServer()...');
startServer().then((server) => {
  console.log('[SERVER] startServer() completed successfully, server is listening');
}).catch((error) => {
  console.error('[SERVER] startServer() failed with error:', error);
  logger.error('Server başlatma exception:', error);
  process.exit(1);
});