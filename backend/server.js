// ============================================================
// BACKEND SERVER - ARŞİV YÖNETİM SİSTEMİ
// ============================================================

// ADIM 1: Load environment variables first
require('dotenv').config();

// ADIM 2: Core Node.js modülleri
const fs = require('fs');
const path = require('path');

// ADIM 3: Environment değişkenlerini ayarla
const isDev = process.env.NODE_ENV !== 'production';

// Ortam değişkenlerini guarantee et
if (!process.env.DB_PATH) {
  process.env.DB_PATH = isDev 
    ? path.join(__dirname, 'arsiv.db')
    : path.join(process.env.USER_DATA_PATH || __dirname, 'arsiv.db');
}
if (!process.env.USER_DATA_PATH) {
  process.env.USER_DATA_PATH = __dirname;
}
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'development';
}

const dbPath = process.env.DB_PATH;
const userDataPath = process.env.USER_DATA_PATH;

// ADIM 3: Logger'ı yükle (DB'den bağımsız)
const logger = require('./src/utils/logger');

logger.info('='.repeat(60));
logger.info('[STARTUP] Backend server başlatılıyor...');
logger.info('[STARTUP] Environment:', {
  NODE_ENV: process.env.NODE_ENV,
  DB_PATH: dbPath,
  USER_DATA_PATH: userDataPath,
  __dirname: __dirname,
  cwd: process.cwd()
});

// ADIM 4: Veritabanı klasörünün var olduğundan emin ol
try {
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
    logger.info(`[DB INIT] Veritabanı klasörü oluşturuldu: ${dbDir}`);
  }
} catch (err) {
  logger.error('[DB INIT] Veritabanı klasörü oluşturulamadı:', err);
  throw err;
}

// ADIM 5: better-sqlite3'ü yükle ve DB'yi initialize et
const Database = require('better-sqlite3');

let db;
try {
  // Veritabanını aç veya oluştur
  db = new Database(dbPath, {
    verbose: isDev ? (msg) => logger.debug('[SQL]', msg) : undefined
  });
  
  // WAL mode'u etkinleştir (daha iyi concurrency)
  db.pragma('journal_mode = WAL');
  
  logger.info(`[DB INIT] Veritabanı bağlantısı kuruldu: ${dbPath}`);
  
} catch (dbErr) {
  logger.error('[DB INIT] Veritabanı başlatılamadı:', dbErr);
  throw dbErr;
}

// ADIM 6: Express ve diğer bağımlılıkları yükle
const express = require('express');
const cors = require('cors');

// ADIM 7: Uygulama modüllerini yükle
const { initSse, stopSse } = require('./src/utils/sse');
const apiRoutes = require('./src/routes');
const { startAutoBackupScheduler, stopAutoBackupScheduler, initAutoBackupState } = require('./src/services/BackupSchedulerService');
const { errorHandler, notFoundHandler } = require('./src/middleware/errorHandler');
const { getDbInstance } = require('./src/database/connection');
const { ensureEnvDefaults: newEnsureEnvDefaults } = require('./src/config/database');
const authController = require('./src/controllers/AuthController');

// Config system'i de çalıştır
newEnsureEnvDefaults();

// --- DB MIGRATION ---

// Sunucu başlamadan önce veritabanı geçişlerini çalıştır.
(async () => {
  try {
    await getDbInstance(); // Bu fonksiyon migrationı da çalıştırır
    logger.info('[DB] Veritabanı şeması başarıyla kontrol edildi/güncellendi.');
    
    // Ensure admin user exists
    await authController.ensureAdminUser();
  } catch (e) {
    logger.error('[FATAL] Veritabanı geçişi başarısız oldu. Uygulama durduruluyor.', { error: e });
    process.exit(1);
  }
})();

// --- END DB MIGRATION ---

const app = express();

if (process.env.NODE_ENV !== 'production') console.log('[SERVER] Setting up CORS...');
const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = [
      'http://localhost:5173',  // Vite dev
      'http://localhost:5174',  // Vite dev (fallback port)
      'http://localhost:4173',  // Vite preview
      'http://127.0.0.1:5173',  // Vite dev (IP)
      'http://127.0.0.1:5174',  // Vite dev (IP fallback port)
      'http://127.0.0.1:4173',  // Vite preview (IP)
    ];
    
    // Production: Sadece file:// ve electron (origin null)
    if (process.env.NODE_ENV === 'production') {
      if (!origin || origin === 'null' || origin?.startsWith('file://')) {
        callback(null, true);
      } else {
        logger.warn('[CORS] Production modda izinsiz origin engellendi:', origin);
        callback(new Error('Not allowed by CORS in production'));
      }
    } else {
      // Development: localhost allowed + null origin (Electron dev)
      if (!origin || origin === 'null' || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        logger.warn('[CORS] Development modda bilinmeyen origin:', origin);
        callback(new Error('Not allowed by CORS'));
      }
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};

// Security headers
app.disable('x-powered-by');
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

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

// API Rotaları (NEW: Using modular src/routes/)
// API Rotaları (NEW: Using modular src/routes/)
const { verifyToken } = require('./src/middleware/authMiddleware');
app.use('/api', verifyToken, apiRoutes);

// Error handlers (must be after routes)
app.use(notFoundHandler);
app.use(errorHandler);

// Production'da static file serving
if (process.env.NODE_ENV === 'production') {
  // Production build'de dist doğrudan app klasöründe
  const staticPaths = [
    path.join(__dirname, '..', 'dist'),           // app/dist (production)
    path.join(__dirname, '..', 'frontend', 'dist') // fallback
  ];
  
  let staticPath = null;
  for (const p of staticPaths) {
    if (fs.existsSync(p)) {
      staticPath = p;
      break;
    }
  }
  
  if (staticPath) {
    app.use(express.static(staticPath));
    logger.info('[STATIC] Serving static files from:', staticPath);
  } else {
    logger.warn('[STATIC] No static path found. Tried:', staticPaths);
  }
}

// Otomatik Yedekleme Zamanlayıcısı
initAutoBackupState();
startAutoBackupScheduler();

// PDF, Excel ve Backup klasörlerini startup'ta oluştur
const { getUserDataPath, ensureDirExists } = require('./src/utils/fileHelper');
const pdfPath = getUserDataPath('PDFs');
const excelPath = getUserDataPath('Excels');
const backupPath = getUserDataPath('Backups');
const tmpPath = getUserDataPath('tmp');
ensureDirExists(pdfPath);
ensureDirExists(excelPath);
ensureDirExists(backupPath);
ensureDirExists(tmpPath);
logger.info('[STARTUP] Required directories ensured:', { pdfPath, excelPath, backupPath, tmpPath });

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
    const gracefulShutdown = (signal) => {
      logger.info(`[BACKEND] Received ${signal} signal. Shutting down gracefully...`);
      
      // Set a timeout for forceful shutdown
      const forceShutdownTimeout = setTimeout(() => {
        logger.error('[BACKEND] Graceful shutdown timeout. Forcing exit...');
        process.exit(1);
      }, 10000); // 10 seconds timeout
      
      server.close(() => {
        clearTimeout(forceShutdownTimeout);
        logger.info('[BACKEND] HTTP server closed.');
        
        // Stop backup scheduler
        try {
          stopAutoBackupScheduler();
        } catch (schedErr) {
          logger.error('[BACKEND] Error stopping backup scheduler:', schedErr);
        }
        
        // Stop SSE
        try {
          stopSse();
        } catch (sseErr) {
          logger.error('[BACKEND] Error stopping SSE:', sseErr);
        }
        
        // Close database connection
        try {
          const { closeDb } = require('./src/database/connection');
          closeDb();
          logger.info('[BACKEND] Database connection closed.');
        } catch (dbErr) {
          logger.error('[BACKEND] Error closing database:', dbErr);
        }
        
        logger.info('[BACKEND] Cleanup complete. Exiting...');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Unhandled errors
    process.on('uncaughtException', (error) => {
      logger.error('[BACKEND] Uncaught Exception:', { error });
      
      // Set a timeout to force exit if graceful shutdown hangs
      const shutdownTimeout = setTimeout(() => {
        logger.error('[BACKEND] Graceful shutdown timeout - forcing exit');
        process.exit(1);
      }, 10000); // 10 second timeout
      
      // Attempt graceful shutdown
      server.close(() => {
        clearTimeout(shutdownTimeout);
        try {
          const { closeDb } = require('./src/database/connection');
          closeDb();
          logger.info('[BACKEND] Database closed after uncaught exception');
        } catch (e) { 
          logger.error('[BACKEND] Error closing database:', { error: e });
        }
        process.exit(1);
      });
      
      // If server.close() doesn't trigger callback (no active connections), force exit
      setTimeout(() => {
        logger.warn('[BACKEND] No active connections, forcing exit');
        clearTimeout(shutdownTimeout);
        try {
          const { closeDb } = require('./src/database/connection');
          closeDb();
        } catch (e) { /* ignore */ }
        process.exit(1);
      }, 1000);
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('[BACKEND] Unhandled Rejection:', { reason: String(reason) });
      // Don't exit on unhandled rejection, just log
    });
  });
}

// Server'ı export et veya doğrudan başlat
module.exports = { startServer, app };

// Eğer doğrudan çalıştırılıyorsa (node server.js)
if (require.main === module) {
  if (process.env.NODE_ENV !== 'production') console.log('[SERVER] About to call startServer()...');
  startServer().then((server) => {
    if (process.env.NODE_ENV !== 'production') console.log('[SERVER] startServer() completed successfully, server is listening');
  }).catch((error) => {
    console.error('[SERVER] startServer() failed with error:', error);
    logger.error('Server başlatma exception:', error);
    process.exit(1);
  });
}