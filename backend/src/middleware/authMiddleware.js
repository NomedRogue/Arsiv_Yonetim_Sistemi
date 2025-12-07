const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

// Secret key should be in env vars, but using a default for simplicity if missing
const JWT_SECRET = process.env.JWT_SECRET || 'gizli-anahtar-degistirilmeli-123456';

const verifyToken = (req, res, next) => {
  // Option requests for CORS are always allowed
  if (req.method === 'OPTIONS') {
    return next();
  }

  // Public routes that don't need auth
  // Public routes that don't need auth
  const publicRoutes = [
    '/api/auth/login',
    '/api/auth/setup', // First time setup if needed
    '/api/status',
    '/api/health',
    '/'
  ];

  // Check against originalUrl to handle mounting points (e.g. /api prefix)
  const normalizedPath = req.originalUrl.split('?')[0];
  if (publicRoutes.includes(normalizedPath)) {
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
