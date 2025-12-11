/**
 * Backup Controller
 * Handles HTTP requests for backup operations
 */

const { getBackupService } = require('../services/BackupService');
const logger = require('../utils/logger');

const backupService = getBackupService();

/**
 * Create manual backup
 * POST /api/backups
 */
async function createBackup(req, res, next) {
  try {
    const backup = await backupService.createBackup('Manuel');

    // Broadcast SSE event
    const { sseBroadcast } = require('../utils/sse');
    sseBroadcast('backup_completed', {
      type: 'Manuel',
      file: backup.name,
      timestamp: backup.timestamp
    });

    res.status(201).json(backup);
  } catch (error) {
    logger.error('[BACKUP_CONTROLLER] createBackup error:', { error });
    next(error);
  }
}

/**
 * Get all backups
 * GET /api/backups
 */
async function listBackups(req, res, next) {
  try {
    const backupsList = await backupService.listBackups();
    const folder = backupService.resolveBackupFolder();
    
    // Frontend format compatibility
    const backups = backupsList.map(b => ({
      filename: b.name,
      size: b.size,
      mtimeMs: b.created.getTime(),
      iso: b.created.toISOString(),
      type: b.name.toLowerCase().endsWith('.zip') ? 'full' : 'database'
    }));
    
    res.json({ backups, folder });
  } catch (error) {
    logger.error('[BACKUP_CONTROLLER] listBackups error:', { error });
    next(error);
  }
}

/**
 * Delete backup
 * DELETE /api/backups/:filename
 */
async function deleteBackup(req, res, next) {
  try {
    const result = await backupService.deleteBackup(req.params.filename);

    // Broadcast SSE event
    const { sseBroadcast } = require('../utils/sse');
    sseBroadcast('backup_deleted', {
      filename: req.params.filename,
      timestamp: new Date()
    });

    res.json(result);
  } catch (error) {
    logger.error('[BACKUP_CONTROLLER] deleteBackup error:', { error, filename: req.params.filename });
    next(error);
  }
}

/**
 * Restore from backup
 * POST /api/backups/:filename/restore
 */
async function restoreBackup(req, res, next) {
  try {
    const result = await backupService.restoreBackup(req.params.filename);
    res.json(result);
  } catch (error) {
    logger.error('[BACKUP_CONTROLLER] restoreBackup error:', { error, filename: req.params.filename });
    next(error);
  }
}

module.exports = {
  createBackup,
  listBackups,
  deleteBackup,
  restoreBackup
};
