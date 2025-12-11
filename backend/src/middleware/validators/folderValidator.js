/**
 * Folder Validation Middleware
 * Validates folder data before processing
 */

const { body, validationResult } = require('express-validator');

/**
 * Validation rules for creating a folder
 */
const createFolderValidation = [
  body('fileCode')
    .trim()
    .notEmpty()
    .withMessage('Dosya kodu gerekli')
    .isLength({ min: 1, max: 100 })
    .withMessage('Dosya kodu 1-100 karakter olmalı'),
  
  body('subject')
    .trim()
    .notEmpty()
    .withMessage('Konu gerekli')
    .isLength({ min: 1, max: 500 })
    .withMessage('Konu 1-500 karakter olmalı'),
  
  body('category')
    .isIn(['Tıbbi', 'İdari'])
    .withMessage('Kategori Tıbbi veya İdari olmalı'),
  
  body('departmentId')
    .isInt({ min: 1 })
    .withMessage('Geçerli bir birim ID gerekli'),
  
  body('fileYear')
    .isInt({ min: 1900, max: 2100 })
    .withMessage('Dosya yılı 1900-2100 arasında olmalı'),
  
  body('fileCount')
    .isInt({ min: 1 })
    .withMessage('Dosya sayısı en az 1 olmalı'),
  
  body('folderType')
    .isIn(['Dar', 'Geniş'])
    .withMessage('Klasör tipi Dar veya Geniş olmalı'),
  
  body('retentionPeriod')
    .isInt({ min: 0 })
    .withMessage('Saklama süresi 0 veya pozitif olmalı'),
  
  body('retentionCode')
    .isIn(['A', 'A1', 'A2', 'A3', 'B', 'C', 'D', 'E'])
    .withMessage('Geçersiz saklama kodu'),
  
  body('location.storageType')
    .isIn(['Kompakt', 'Stand'])
    .withMessage('Lokasyon tipi Kompakt veya Stand olmalı'),
  
  body('clinic')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Klinik adı en fazla 200 karakter olmalı'),
  
  body('specialInfo')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Özel bilgi en fazla 1000 karakter olmalı'),
];

/**
 * Validation rules for updating a folder
 */
const updateFolderValidation = [
  body('fileCode')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Dosya kodu 1-100 karakter olmalı'),
  
  body('subject')
    .optional()
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Konu 1-500 karakter olmalı'),
  
  body('category')
    .optional()
    .isIn(['Tıbbi', 'İdari'])
    .withMessage('Kategori Tıbbi veya İdari olmalı'),
  
  body('departmentId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Geçerli bir birim ID gerekli'),
  
  body('fileYear')
    .optional()
    .isInt({ min: 1900, max: 2100 })
    .withMessage('Dosya yılı 1900-2100 arasında olmalı'),
  
  body('fileCount')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Dosya sayısı en az 1 olmalı'),
  
  body('folderType')
    .optional()
    .isIn(['Dar', 'Geniş'])
    .withMessage('Klasör tipi Dar veya Geniş olmalı'),
  
  body('status')
    .optional()
    .isIn(['Arşivde', 'Çıkışta', 'İmha'])
    .withMessage('Geçersiz durum değeri'),
];

/**
 * Validation rules for location
 */
const locationValidation = [
  body('storageType')
    .isIn(['Kompakt', 'Stand'])
    .withMessage('Lokasyon tipi Kompakt veya Stand olmalı'),
  
  body('unit')
    .if(body('storageType').equals('Kompakt'))
    .isInt({ min: 1 })
    .withMessage('Kompakt için ünite numarası gerekli'),
  
  body('stand')
    .if(body('storageType').equals('Stand'))
    .isInt({ min: 1 })
    .withMessage('Stand için stand numarası gerekli'),
];

/**
 * Middleware to check validation results
 */
function validate(req, res, next) {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(err => err.msg).join(', ');
    return res.status(400).json({ 
      error: errorMessages,
      details: errors.array()
    });
  }
  
  next();
}

module.exports = {
  createFolderValidation,
  updateFolderValidation,
  locationValidation,
  validate
};
