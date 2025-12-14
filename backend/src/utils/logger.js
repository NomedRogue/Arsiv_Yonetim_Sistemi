// Simple logger to avoid console.log in production and structure logs.
// Using electron-log for file logging and rotation.
const logElectron = require('electron-log');
const path = require('path');

const isDev = process.env.NODE_ENV === 'development';

// Configure electron-log
logElectron.transports.file.level = 'info';
logElectron.transports.console.level = isDev ? 'debug' : 'info';

// Rotation: Max 10MB, Keep 7 days
logElectron.transports.file.maxSize = 10 * 1024 * 1024;
logElectron.transports.file.resolvePathFn = (variables) => {
  return path.join(process.env.USER_DATA_PATH || __dirname, 'logs', 'app.log');
};

// Sensitive field names that should be masked in logs
const SENSITIVE_FIELDS = [
  'password', 'passwd', 'pwd', 'secret', 'token', 'apikey', 'api_key',
  'authorization', 'auth', 'credential', 'private_key', 'privatekey',
  'access_token', 'refresh_token', 'session_id', 'sessionid', 'cookie'
];

/**
 * Masks sensitive data in objects before logging
 * @param {any} obj - Object to mask
 * @returns {any} - Masked object
 */
const maskSensitiveData = (obj) => {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;
  if (obj instanceof Error) {
    return { message: obj.message, stack: obj.stack };
  }
  if (Array.isArray(obj)) {
    return obj.map(item => maskSensitiveData(item));
  }
  
  const masked = {};
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    const isSensitive = SENSITIVE_FIELDS.some(field => lowerKey.includes(field));
    
    if (isSensitive && value) {
      masked[key] = '***MASKED***';
    } else if (typeof value === 'object' && value !== null) {
      masked[key] = maskSensitiveData(value);
    } else {
      masked[key] = value;
    }
  }
  return masked;
};

const log = (level, message, meta) => {
  // Mask sensitive data in meta before logging
  const safeMeta = meta ? maskSensitiveData(meta) : undefined;
  
  // Use electron-log
  if (level === 'error') {
    logElectron.error(message, safeMeta || '');
  } else if (level === 'warn') {
    logElectron.warn(message, safeMeta || '');
  } else if (level === 'info') {
    logElectron.info(message, safeMeta || '');
  } else if (level === 'debug') {
    logElectron.debug(message, safeMeta || '');
  }
};

const logger = {
  debug: (message, meta) => {
    if (isDev) {
      log('debug', message, meta);
    }
  },
  info: (message, meta) => log('info', message, meta),
  warn: (message, meta) => log('warn', message, meta),
  error: (message, meta) => log('error', message, meta),
};

module.exports = logger;
