



const express = require('express');
const cors = require('cors');
const { initSse } = require('./sse');
const apiRoutes = require('./routes');
const { startAutoBackupScheduler, initAutoBackupState } = require('./backupScheduler');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const logger = require('./logger');
const dbManager = require('./db');

// --- DB MIGRATION ---
// Sunucu başlamadan önce veritabanı geçişlerini çalıştır.
try {
  dbManager.migrate();
  logger.info('[DB] Veritabanı şeması başarıyla kontrol edildi/güncellendi.');
} catch (e) {
  logger.error('[FATAL] Veritabanı geçişi başarısız oldu. Uygulama durduruluyor.', { error: e });
  process.exit(1);
}
// --- END DB MIGRATION ---

const app = express();

const corsOptions = {
  origin: (origin, callback) => {
    // In dev, allow Vite server. In prod, allow file:// (origin is null)
    // and other same-origin-like requests.
    const allowedOrigins = ['http://localhost:5173'];
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Express 4.16.0+ ve 5.x ile uyumlu dahili body-parser kullanıldı.
// Bu, arayüzden gelen verilerin doğru işlenmesini garanti eder.
app.use(express.json({ limit: '50mb' }));

// SSE (Server-Sent Events)
initSse(app);

// API Rotaları
app.use('/api', apiRoutes);

// Otomatik Yedekleme Zamanlayıcısı
initAutoBackupState();
startAutoBackupScheduler();

// 404 handler for unmatched routes
app.use(notFoundHandler);

// Merkezi Hata Yönetimi
app.use(errorHandler);

const PORT = 3001;

try {
  const server = app.listen(PORT, () => {
    logger.info(`Backend http://localhost:${PORT} üzerinde çalışıyor...`);
  });
  
  server.on('error', (err) => {
    logger.error('Server başlatma hatası:', err);
  });
} catch (error) {
  logger.error('Server başlatma exception:', error);
}