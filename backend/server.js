console.log('[SERVER] Starting server.js execution...');

const express = require('express');
console.log('[SERVER] Express loaded');

const cors = require('cors');
console.log('[SERVER] CORS loaded');

const path = require('path');
const fs = require('fs');
console.log('[SERVER] Path and FS loaded');

const { initSse } = require('./sse');
console.log('[SERVER] SSE module loaded');

const apiRoutes = require('./routes');
console.log('[SERVER] API routes loaded');

const { startAutoBackupScheduler, initAutoBackupState } = require('./backupScheduler');
console.log('[SERVER] Backup scheduler loaded');

const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
console.log('[SERVER] Error handlers loaded');

const logger = require('./logger');
console.log('[SERVER] Logger loaded');

const dbManager = require('./db');
console.log('[SERVER] DB Manager loaded');

console.log('[SERVER] All modules loaded successfully');

// --- ENVIRONMENT SETUP ---
console.log('[SERVER] Starting environment setup...');

// main.js'ten ortam değişkenleri gelecek, yoksa default değerler kullan
if (!process.env.DB_PATH) {
  process.env.DB_PATH = path.join(__dirname, 'arsiv.db');
}
if (!process.env.USER_DATA_PATH) {
  process.env.USER_DATA_PATH = __dirname;
}
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'development';
}

console.log('[SERVER] Environment variables set');

logger.info('[SERVER] Environment setup:', {
  DB_PATH: process.env.DB_PATH,
  USER_DATA_PATH: process.env.USER_DATA_PATH,
  NODE_ENV: process.env.NODE_ENV
});

console.log('[SERVER] Environment setup completed');

// --- DB MIGRATION ---
console.log('[SERVER] Starting database migration...');

// Sunucu başlamadan önce veritabanı geçişlerini çalıştır.
(async () => {
  try {
    console.log('[SERVER] Calling dbManager.getDbInstance()...');
    await dbManager.getDbInstance(); // Bu fonksiyon migrationı da çalıştırır
    console.log('[SERVER] Database migration completed successfully');
    logger.info('[DB] Veritabanı şeması başarıyla kontrol edildi/güncellendi.');
  } catch (e) {
    console.error('[SERVER] Database migration FAILED:', e);
    logger.error('[FATAL] Veritabanı geçişi başarısız oldu. Uygulama durduruluyor.', { error: e });
    process.exit(1);
  }
})();
console.log('[SERVER] DB Migration section completed');
// --- END DB MIGRATION ---

console.log('[SERVER] Creating Express app...');
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
console.log('[SERVER] CORS options set');
app.use(cors(corsOptions));
console.log('[SERVER] CORS middleware applied');

// Express 4.16.0+ ve 5.x ile uyumlu dahili body-parser kullanıldı.
// Bu, arayüzden gelen verilerin doğru işlenmesini garanti eder.
app.use(express.json({ limit: '50mb' }));
console.log('[SERVER] JSON parser middleware applied');

// SSE (Server-Sent Events)
console.log('[SERVER] Initializing SSE...');
initSse(app);
console.log('[SERVER] SSE initialized');

// Root endpoint for health checks
app.get('/', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Arşiv Yönetim Sistemi Backend',
    timestamp: new Date().toISOString()
  });
});
console.log('[SERVER] Health check endpoint registered');

// API Rotaları
console.log('[SERVER] Registering API routes...');
app.use('/api', apiRoutes);
console.log('[SERVER] API routes registered');

// Production'da static file serving (main.js'ten taşındı)
if (process.env.NODE_ENV === 'production') {
  console.log('[SERVER] Setting up static file serving for production...');
  const staticPath = path.join(__dirname, '..', 'frontend', 'dist');
  console.log('[SERVER] Static path:', staticPath);
  
  if (fs.existsSync(staticPath)) {
    app.use(express.static(staticPath));
    
    // SPA fallback - tüm diğer istekleri index.html'e yönlendir
    app.get('*', (req, res) => {
      res.sendFile(path.join(staticPath, 'index.html'));
    });
    console.log('[SERVER] Static files middleware configured');
    logger.info('[STATIC] Serving static files from:', staticPath);
  } else {
    console.log('[SERVER] Static path not found:', staticPath);
    logger.warn('[STATIC] Static path not found:', staticPath);
  }
}

// Otomatik Yedekleme Zamanlayıcısı
console.log('[SERVER] Initializing backup scheduler...');
initAutoBackupState();
startAutoBackupScheduler();
console.log('[SERVER] Backup scheduler initialized');

// 404 handler for unmatched routes
console.log('[SERVER] Registering 404 handler...');
app.use(notFoundHandler);
console.log('[SERVER] 404 handler registered');

// Merkezi Hata Yönetimi
console.log('[SERVER] Registering error handler...');
app.use(errorHandler);
console.log('[SERVER] Error handler registered');

console.log('[SERVER] Express app setup completed');

const PORT = process.env.PORT || 3001;
console.log('[SERVER] Port set to:', PORT);

function startServer() {
  console.log('[SERVER] startServer() function called');
  console.log('[SERVER] Attempting to listen on port:', PORT);
  
  return new Promise((resolve, reject) => {
    console.log('[SERVER] Creating server listener...');
    const server = app.listen(PORT, '127.0.0.1', () => {
      console.log(`[SERVER] Server successfully listening on http://localhost:${PORT}`);
      logger.info(`Backend http://localhost:${PORT} üzerinde çalışıyor...`);
      resolve(server);
    });
    
    server.on('error', (err) => {
      console.error('[SERVER] Server error occurred:', err);
      if (err.code === 'EADDRINUSE') {
        console.log('[SERVER] Port already in use, trying alternative port...');
        logger.error(`Port ${PORT} already in use. Trying alternative port...`);
        
        // Alternatif port dene
        const altServer = app.listen(0, '127.0.0.1', () => {
          const actualPort = altServer.address().port;
          console.log(`[SERVER] Alternative server listening on port: ${actualPort}`);
          logger.info(`Backend http://localhost:${actualPort} üzerinde çalışıyor... (alternatif port)`);
          resolve(altServer);
        });
        
        altServer.on('error', (altErr) => {
          console.error('[SERVER] Alternative server also failed:', altErr);
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