/**
 * Backup Routes
 * RESTful endpoints for backup operations
 */

const express = require('express');
const router = express.Router();
const backupController = require('../controllers/BackupController');
const { strictLimiter } = require('../middleware/rateLimiter');

/**
 * @swagger
 * tags:
 *   name: Backups
 *   description: Database backup and restore operations
 */

/**
 * @swagger
 * /backups:
 *   post:
 *     summary: Create a manual backup
 *     tags: [Backups]
 *     responses:
 *       200:
 *         description: Backup created successfully
 */
router.post('/', strictLimiter, backupController.createBackup);

/**
 * @swagger
 * /backups:
 *   get:
 *     summary: List all available backup files
 *     tags: [Backups]
 *     responses:
 *       200:
 *         description: List of backups
 */
router.get('/', backupController.listBackups);

/**
 * @swagger
 * /backups/{filename}:
 *   delete:
 *     summary: Delete a backup file
 *     tags: [Backups]
 *     parameters:
 *       - in: path
 *         name: filename
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Backup deleted
 */
router.delete('/:filename', strictLimiter, backupController.deleteBackup);

/**
 * @swagger
 * /backups/{filename}/restore:
 *   post:
 *     summary: Restore database from a backup file (Dangerous!)
 *     tags: [Backups]
 *     parameters:
 *       - in: path
 *         name: filename
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Restore initiated/completed
 */
router.post('/:filename/restore', strictLimiter, backupController.restoreBackup);

module.exports = router;
