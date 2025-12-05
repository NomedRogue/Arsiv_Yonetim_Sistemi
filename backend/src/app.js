/**
 * Express Application Setup
 * Configures Express app with middleware and routes
 * Separates app configuration from server startup
 */

const express = require('express');
const cors = require('cors');
const { initSse } = require('./utils/sse');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimiter');
const corsOptions = require('./config/corsOptions');
const logger = require('./utils/logger');

function createApp() {
  const app = express();

  // CORS
  app.use(cors(corsOptions));
  
  // Body parsing
  app.use(express.json({ limit: '50mb' }));
  
  // Rate limiting for API endpoints (100 requests per minute per IP)
  app.use('/api', apiLimiter);

  // SSE (Server-Sent Events)
  initSse(app);

  // Root health check
  app.get('/', (req, res) => {
    res.json({ 
      status: 'ok', 
      message: 'Arşiv Yönetim Sistemi Backend',
      timestamp: new Date().toISOString(),
      version: '2.0.0-refactored'
    });
  });

  // API Routes - NEW HYBRID SYSTEM
  // Supports both legacy and new refactored routes
  const apiRoutes = require('./routes');
  app.use('/api', apiRoutes);

  // Production static file serving
  if (process.env.NODE_ENV === 'production') {
    const path = require('path');
    const fs = require('fs');
    const staticPath = path.join(__dirname, '..', '..', 'frontend', 'dist');
    
    if (fs.existsSync(staticPath)) {
      app.use(express.static(staticPath));
      
      // SPA fallback
      app.get('*', (req, res) => {
        res.sendFile(path.join(staticPath, 'index.html'));
      });
      logger.info('[STATIC] Serving static files from:', staticPath);
    } else {
      logger.warn('[STATIC] Static path not found:', staticPath);
    }
  }

  // 404 handler
  app.use(notFoundHandler);

  // Error handler (must be last)
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
