/**
 * CORS Configuration
 * Centralized CORS settings for development and production
 */

const logger = require('../utils/logger');

const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = [
      'http://localhost:5173',  // Vite dev
      'http://localhost:4173',  // Vite preview
    ];
    
    // Production: Sadece file:// ve electron (origin null)
    if (process.env.NODE_ENV === 'production') {
      if (!origin || origin === 'null' || origin?.startsWith('file://')) {
        callback(null, true);
      } else {
        logger.warn('[CORS] Production modda izin verilmeyen origin:', origin);
        callback(new Error('Not allowed by CORS'));
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

module.exports = corsOptions;
