/**
 * PDF Controller
 * Handles PDF upload/delete operations
 */

const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { getUserDataPath, ensureDirExists, validateFilePath, checkDiskSpace } = require('../utils/fileHelper');
const { getRepositories } = require('../database/repositories');
const logger = require('../utils/logger');

// Minimum required disk space for upload (100MB)
const MIN_DISK_SPACE_BYTES = 100 * 1024 * 1024;

// Get upload middleware for PDF
function getUploadPdfMiddleware() {
  const repos = getRepositories();
  const settings = repos.config.get('settings');
  
  let pdfFolder = getUserDataPath('PDFs');
  if (settings && settings.pdfKayitKlasoru && settings.pdfKayitKlasoru.trim() !== '') {
    pdfFolder = settings.pdfKayitKlasoru;
  }
  
  ensureDirExists(pdfFolder);
  
  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, pdfFolder),
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
      if (ext === '.pdf') {
        cb(null, true);
      } else {
        cb(new Error('Sadece PDF dosyaları yüklenebilir.'));
      }
    },
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB
  });
}

const pdfController = {
  /**
   * POST /api/upload-pdf
   * Upload PDF file with disk space check
   */
  async uploadPdf(req, res, next) {
    try {
      // Check disk space before upload
      const repos = getRepositories();
      const settings = repos.config.get('settings');
      let pdfFolder = getUserDataPath('PDFs');
      if (settings && settings.pdfKayitKlasoru) {
        pdfFolder = settings.pdfKayitKlasoru;
      }

      const diskSpace = await checkDiskSpace(pdfFolder);
      
      if (diskSpace.free < MIN_DISK_SPACE_BYTES) {
        const error = new Error('Yetersiz disk alanı. En az 100MB boş alan gerekli.');
        error.statusCode = 507; // Insufficient Storage
        return next(error);
      }
      
      const upload = getUploadPdfMiddleware();
      
      upload.single('pdf')(req, res, (err) => {
        if (err) {
          logger.error('[PDF CONTROLLER] Upload failed:', err);
          return next(err);
        }

        if (!req.file) {
          const error = new Error('PDF dosyası yüklenemedi.');
          error.statusCode = 400;
          return next(error);
        }

        const repos = getRepositories();
        repos.log.addLog({
          type: 'pdf_upload',
          details: `PDF yüklendi: ${req.file.filename}`
        });

        res.json({ filename: req.file.filename });
      });
    } catch (error) {
      logger.error('[PDF CONTROLLER] Upload failed:', error);
      next(error);
    }
  },

  /**
   * DELETE /api/pdf/delete-pdf/:filename
   * Delete PDF file
   */
  async deletePdf(req, res, next) {
    try {
      const { filename } = req.params;
      const pdfFolder = getUserDataPath('PDFs');
      
      // Validate file path to prevent path traversal
      const validation = validateFilePath(filename, pdfFolder);
      if (!validation.isValid) {
        const error = new Error(validation.error);
        error.statusCode = 400;
        return next(error);
      }

      if (!fs.existsSync(validation.safePath)) {
        const error = new Error('PDF dosyası bulunamadı.');
        error.statusCode = 404;
        return next(error);
      }

      fs.unlinkSync(validation.safePath);

      const repos = getRepositories();
      repos.log.addLog({
        type: 'pdf_delete',
        details: `PDF silindi: ${filename}`
      });

      res.json({ message: 'PDF silindi.' });
    } catch (error) {
      logger.error('[PDF CONTROLLER] Delete failed:', error);
      next(error);
    }
  },

  /**
   * GET /api/pdf/pdf-path/:filename
   * Get PDF file path (for Electron)
   */
  async getPdfPath(req, res, next) {
    try {
      const { filename } = req.params;
      const pdfFolder = getUserDataPath('PDFs');
      
      // Validate file path to prevent path traversal
      const validation = validateFilePath(filename, pdfFolder);
      if (!validation.isValid) {
        const error = new Error(validation.error);
        error.statusCode = 400;
        return next(error);
      }

      if (!fs.existsSync(validation.safePath)) {
        logger.warn('[PDF CONTROLLER] PDF file not found:', { filename, safePath: validation.safePath });
        const error = new Error(`PDF dosyası bulunamadı: ${filename}. Dosya silinmiş veya taşınmış olabilir.`);
        error.statusCode = 404;
        return next(error);
      }

      res.json({ filePath: validation.safePath });
    } catch (error) {
      logger.error('[PDF CONTROLLER] Get path failed:', error);
      next(error);
    }
  },

  /**
   * GET /api/pdf/serve-pdf/:filename
   * Serve PDF file (for browser)
   */
  async servePdf(req, res, next) {
    try {
      const { filename } = req.params;
      const pdfFolder = getUserDataPath('PDFs');
      
      // Validate file path to prevent path traversal
      const validation = validateFilePath(filename, pdfFolder);
      if (!validation.isValid) {
        const error = new Error(validation.error);
        error.statusCode = 400;
        return next(error);
      }

      if (!fs.existsSync(validation.safePath)) {
        const error = new Error('PDF dosyası bulunamadı.');
        error.statusCode = 404;
        return next(error);
      }

      res.contentType('application/pdf');
      res.sendFile(validation.safePath);
    } catch (error) {
      logger.error('[PDF CONTROLLER] Serve failed:', error);
      next(error);
    }
  }
};

module.exports = pdfController;
