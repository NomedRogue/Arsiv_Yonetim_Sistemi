/**
 * Backup Routes
 * RESTful endpoints for backup operations
 */

const express = require('express');
const router = express.Router();
const backupController = require('../controllers/BackupController');
const { strictLimiter } = require('../middleware/rateLimiter');

// POST /api/backups - Create manual backup (rate limited - sensitive operation)
router.post('/', strictLimiter, backupController.createBackup);

// GET /api/backups - List all backups
router.get('/', backupController.listBackups);

// DELETE /api/backups/:filename - Delete backup (rate limited - sensitive operation)
router.delete('/:filename', strictLimiter, backupController.deleteBackup);

// POST /api/backups/:filename/restore - Restore from backup (rate limited - sensitive operation)
router.post('/:filename/restore', strictLimiter, backupController.restoreBackup);

module.exports = router;
