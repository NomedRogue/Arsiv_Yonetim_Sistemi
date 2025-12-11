const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

// JWT Secret MUST be provided via environment variable
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  logger.error('[FATAL] JWT_SECRET environment variable is not set. Application cannot start.');
  throw new Error('JWT_SECRET environment variable is required for security. Please set it in your environment or .env file.');
}

if (JWT_SECRET.length < 32) {
  logger.warn('[SECURITY] JWT_SECRET is too short. Recommended minimum length is 32 characters.');
}

const verifyToken = (req, res, next) => {
  // Option requests for CORS are always allowed
  if (req.method === 'OPTIONS') {
    return next();
  }

  // Public routes that don't need auth
  const publicRoutes = [
    '/api/auth/login',
    '/api/auth/setup', // First time setup if needed
    '/api/status',
    '/api/health',
    '/'
    // REMOVED: '/api/all-data' - Now requires authentication to protect sensitive config data
  ];

  // Check if path starts with any of these patterns (for dynamic routes)
  const publicPathPatterns = [
    // REMOVED: '/api/search/' - Now requires authentication to prevent data leakage
    '/api/pdf/pdf-path/',
    '/api/pdf/serve-pdf/',
    '/api/excel/excel-path/',
    '/api/excel/serve-excel/'
  ];

  // Check against originalUrl to handle mounting points (e.g. /api prefix)
  const normalizedPath = req.originalUrl.split('?')[0];
  if (publicRoutes.includes(normalizedPath)) {
    return next();
  }

  // Check if path starts with any public pattern
  if (publicPathPatterns.some(pattern => normalizedPath.startsWith(pattern))) {
    return next();
  }

  const token = req.headers['authorization']?.split(' ')[1]; // Bearer <token>

  if (!token) {
    logger.warn('[AUTH] No token provided', { ip: req.ip, path: req.path });
    return res.status(403).json({ error: 'Erişim reddedildi. Token bulunamadı.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    logger.warn('[AUTH] Invalid token', { error: err.message, ip: req.ip });
    return res.status(401).json({ error: 'Geçersiz veya süresi dolmuş oturum.' });
  }
};

const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    logger.warn('[AUTH] Forbidden access attempt to admin route', { ip: req.ip, user: req.user?.username });
    return res.status(403).json({ error: 'Bu işlem için yönetici yetkisi gereklidir.' });
  }
  next();
};

module.exports = { verifyToken, requireAdmin, JWT_SECRET };
