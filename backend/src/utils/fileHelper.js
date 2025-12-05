const path = require('path');
const fs = require('fs');
const logger = require('./logger');

// Dynamic olarak al - her çağrıda güncel değeri kullan
function getUserDataPath(...segments) {
  const userDataPath = process.env.USER_DATA_PATH || process.cwd();
  return path.join(userDataPath, ...segments);
}

function ensureDirExists(dirPath) {
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      logger.debug(`[SAFE MKDIR] Dizin oluşturuldu: ${dirPath}`);
    }
  } catch (err) {
    logger.error('[SAFE MKDIR] Dizin oluşturulamadı', { error: err });
  }
}

function safeCopyFileSync(src, dest) {
  try {
    fs.copyFileSync(src, dest);
    logger.debug(`[SAFE COPY] Dosya kopyalandı: ${src} -> ${dest}`);
  } catch (err) {
    logger.error('[SAFE COPY] Dosya kopyalanamadı', { error: err });
  }
}

/**
 * Validate and sanitize filename to prevent path traversal attacks
 * @param {string} filename - The filename to validate
 * @param {string} allowedFolder - The folder where file should be located
 * @returns {{ isValid: boolean, safePath: string|null, error: string|null }}
 */
function validateFilePath(filename, allowedFolder) {
  // Reject if filename is empty or not a string
  if (!filename || typeof filename !== 'string') {
    return { isValid: false, safePath: null, error: 'Geçersiz dosya adı' };
  }

  // Extract only the basename (removes any path components)
  const basename = path.basename(filename);
  
  // Reject if basename is empty after extraction
  if (!basename || basename === '.' || basename === '..') {
    return { isValid: false, safePath: null, error: 'Geçersiz dosya adı' };
  }
  
  // Reject filenames with suspicious patterns
  const suspiciousPatterns = /[<>:"|?*\x00-\x1f]|\.\.|\/{2,}|\\{2,}/;
  if (suspiciousPatterns.test(filename)) {
    logger.warn('[SECURITY] Path traversal attempt detected:', { filename });
    return { isValid: false, safePath: null, error: 'Geçersiz karakter içeren dosya adı' };
  }

  // Construct the safe path
  const safePath = path.join(allowedFolder, basename);
  
  // Verify the resolved path is still within the allowed folder
  const resolvedPath = path.resolve(safePath);
  const resolvedFolder = path.resolve(allowedFolder);
  
  if (!resolvedPath.startsWith(resolvedFolder + path.sep) && resolvedPath !== resolvedFolder) {
    logger.warn('[SECURITY] Path traversal blocked:', { filename, resolvedPath, allowedFolder });
    return { isValid: false, safePath: null, error: 'Dosya yolu güvenlik ihlali' };
  }

  return { isValid: true, safePath: resolvedPath, error: null };
}

/**
 * Check available disk space (Windows compatible)
 * @param {string} dirPath - Directory to check
 * @returns {Promise<{ free: number, total: number }>} - Free and total space in bytes
 */
async function checkDiskSpace(dirPath) {
  try {
    const { execSync } = require('child_process');
    const drive = path.parse(dirPath).root;
    
    // Windows: Use WMIC to get disk space
    const result = execSync(`wmic logicaldisk where "DeviceID='${drive.replace('\\', '')}'" get FreeSpace,Size /value`, {
      encoding: 'utf8'
    });
    
    const freeMatch = result.match(/FreeSpace=(\d+)/);
    const sizeMatch = result.match(/Size=(\d+)/);
    
    return {
      free: freeMatch ? parseInt(freeMatch[1], 10) : 0,
      total: sizeMatch ? parseInt(sizeMatch[1], 10) : 0
    };
  } catch (err) {
    logger.warn('[DISK SPACE] Could not check disk space:', { error: err.message });
    // Return large values to not block operations if check fails
    return { free: Number.MAX_SAFE_INTEGER, total: Number.MAX_SAFE_INTEGER };
  }
}

module.exports = {
  getUserDataPath,
  ensureDirExists,
  safeCopyFileSync,
  validateFilePath,
  checkDiskSpace,
};