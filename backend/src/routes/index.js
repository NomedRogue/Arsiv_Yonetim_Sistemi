/**
 * Routes Index
 * Central routing configuration - Hybrid mode (old + new)
 * Gradually migrating from monolithic routes.js to modular structure
 */

const express = require('express');
const router = express.Router();

// Import modular routes (Migration Completed!)
const folderRoutes = require('./folders.routes');
const checkoutRoutes = require('./checkouts.routes');
const backupRoutes = require('./backups.routes');
const searchRoutes = require('./search.routes');
const statsRoutes = require('./stats.routes');
const disposalRoutes = require('./disposals.routes');
const logRoutes = require('./logs.routes');
const configRoutes = require('./config.routes');
const pdfRoutes = require('./pdf.routes');
const excelRoutes = require('./excel.routes');
const authRoutes = require('./auth.routes');

// Root health check endpoint
router.get('/', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Arşiv Yönetim Sistemi Backend',
    timestamp: new Date().toISOString(),
    version: '2.0.0-refactored'
  });
});

// Health check endpoint
router.get('/health', async (req, res) => {
  try {
    const { getDbInstance } = require('../database/connection');
    const db = getDbInstance();
    
    // Simple DB health check
    const result = db.prepare('SELECT 1 as ok').get();
    
    res.json({
      status: 'healthy',
      database: result.ok === 1 ? 'connected' : 'error',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      database: 'error',
      error: error.message
    });
  }
});

// NEW ROUTES (Refactored with Service/Repository pattern)
// Migration completed - these are now the primary routes
router.use('/folders', folderRoutes);
router.use('/checkouts', checkoutRoutes);
router.use('/backups', backupRoutes);
router.use('/search', searchRoutes);
router.use('/stats', statsRoutes);
router.use('/disposals', disposalRoutes);
router.use('/logs', logRoutes);
router.use('/pdf', pdfRoutes);
router.use('/excel', excelRoutes);
router.use('/auth', authRoutes);
router.use('/', configRoutes); // all-data, save-configs at root level

module.exports = router;
