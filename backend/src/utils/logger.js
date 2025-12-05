const fs = require('fs');
const path = require('path');
const { getUserDataPath } = require('./fileHelper');

// Simple logger to avoid console.log in production and structure logs.
// In a real app, use a library like Winston or Pino.

const isDev = process.env.NODE_ENV === 'development';

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
  
  const logEntry = {
    level,
    timestamp: new Date().toISOString(),
    message,
    ...(safeMeta && { meta: safeMeta }),
  };
  
  const output = JSON.stringify(logEntry);
  
  if (level === 'error') {
    console.error(output);
  } else if (level === 'warn') {
    console.warn(output);
  } else {
    // In dev, log plain text for readability
    if (isDev) {
      console.log(`[${level.toUpperCase()}] ${message}`, safeMeta || '');
    } else {
      console.log(output);
    }
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
