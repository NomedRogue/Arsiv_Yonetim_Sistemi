/**
 * Excel Controller
 * Handles Excel upload/delete operations
 */

const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { getUserDataPath, ensureDirExists, validateFilePath, checkDiskSpace } = require('../utils/fileHelper');
const { getRepositories } = require('../database/repositories');
const logger = require('../utils/logger');

// Minimum required disk space for upload (100MB)
const MIN_DISK_SPACE_BYTES = 100 * 1024 * 1024;

// Get upload middleware for Excel
function getUploadExcelMiddleware() {
  const repos = getRepositories();
  const settings = repos.config.get('settings');
  
  let excelFolder = getUserDataPath('Excels');
  if (settings && settings.excelKayitKlasoru && settings.excelKayitKlasoru.trim() !== '') {
    excelFolder = settings.excelKayitKlasoru;
  }

  ensureDirExists(excelFolder);
  
  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, excelFolder),
    filename: (_req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(file.originalname);
      // Türkçe karakterleri decode et (UTF-8 encoding düzeltmesi)
      let originalName = file.originalname;
      try {
        // Eğer dosya adı Latin-1 olarak encode edilmişse UTF-8'e çevir
        originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
      } catch (e) {
        // Encoding hatası olursa orijinal adı kullan
        originalName = file.originalname;
      }
      const baseName = path.basename(originalName, ext);
      cb(null, `${baseName}-${uniqueSuffix}${ext}`);
    }
  });

  return multer({
    storage,
    fileFilter: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      if (ext === '.xlsx' || ext === '.xls') {
        cb(null, true);
      } else {
        cb(new Error('Sadece Excel dosyaları yüklenebilir.'));
      }
    },
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB
  });
}

const excelController = {
  /**
   * POST /api/excel/upload-excel
   * Upload Excel file with disk space check
   */
  async uploadExcel(req, res, next) {
    try {
      // Check disk space before upload
      const repos = getRepositories();
      const settings = repos.config.get('settings');
      let excelFolder = getUserDataPath('Excels');
      if (settings && settings.excelKayitKlasoru) {
        excelFolder = settings.excelKayitKlasoru;
      }

      const diskSpace = await checkDiskSpace(excelFolder);
      
      if (diskSpace.free < MIN_DISK_SPACE_BYTES) {
        const error = new Error('Yetersiz disk alanı. En az 100MB boş alan gerekli.');
        error.statusCode = 507; // Insufficient Storage
        return next(error);
      }
      
      const upload = getUploadExcelMiddleware();
      
      upload.single('excel')(req, res, (err) => {
        if (err) {
          logger.error('[EXCEL CONTROLLER] Upload failed:', err);
          return next(err);
        }

        if (!req.file) {
          const error = new Error('Excel dosyası yüklenemedi.');
          error.statusCode = 400;
          return next(error);
        }

        const repos = getRepositories();
        repos.log.addLog({
          type: 'excel_upload',
          details: `Excel yüklendi: ${req.file.filename}`
        });

        res.json({ filename: req.file.filename });
      });
    } catch (error) {
      logger.error('[EXCEL CONTROLLER] Upload failed:', error);
      next(error);
    }
  },

  /**
   * DELETE /api/excel/delete-excel/:filename
   * Delete Excel file
   */
  async deleteExcel(req, res, next) {
    try {
      const { filename } = req.params;
      const excelFolder = getUserDataPath('Excels');
      
      // Validate file path to prevent path traversal
      const validation = validateFilePath(filename, excelFolder);
      if (!validation.isValid) {
        const error = new Error(validation.error);
        error.statusCode = 400;
        return next(error);
      }

      if (!fs.existsSync(validation.safePath)) {
        const error = new Error('Excel dosyası bulunamadı.');
        error.statusCode = 404;
        return next(error);
      }

      fs.unlinkSync(validation.safePath);

      const repos = getRepositories();
      repos.log.addLog({
        type: 'excel_delete',
        details: `Excel silindi: ${filename}`
      });

      res.json({ message: 'Excel silindi.' });
    } catch (error) {
      logger.error('[EXCEL CONTROLLER] Delete failed:', error);
      next(error);
    }
  },

  /**
   * GET /api/excel/excel-path/:filename
   * Get Excel file path (for Electron)
   */
  async getExcelPath(req, res, next) {
    try {
      const { filename } = req.params;
      const excelFolder = getUserDataPath('Excels');
      
      // Validate file path to prevent path traversal
      const validation = validateFilePath(filename, excelFolder);
      if (!validation.isValid) {
        const error = new Error(validation.error);
        error.statusCode = 400;
        return next(error);
      }

      if (!fs.existsSync(validation.safePath)) {
        const error = new Error('Excel dosyası bulunamadı.');
        error.statusCode = 404;
        return next(error);
      }

      res.json({ filePath: validation.safePath });
    } catch (error) {
      logger.error('[EXCEL CONTROLLER] Get path failed:', error);
      next(error);
    }
  },

  /**
   * GET /api/excel/serve-excel/:filename
   * Serve Excel file (for browser)
   */
  async serveExcel(req, res, next) {
    try {
      const { filename } = req.params;
      const excelFolder = getUserDataPath('Excels');
      
      // Validate file path to prevent path traversal
      const validation = validateFilePath(filename, excelFolder);
      if (!validation.isValid) {
        const error = new Error(validation.error);
        error.statusCode = 400;
        return next(error);
      }

      if (!fs.existsSync(validation.safePath)) {
        const error = new Error('Excel dosyası bulunamadı.');
        error.statusCode = 404;
        return next(error);
      }

      res.contentType('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.sendFile(validation.safePath);
    } catch (error) {
      logger.error('[EXCEL CONTROLLER] Serve failed:', error);
      next(error);
    }
  }
};

module.exports = excelController;
