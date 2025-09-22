const fs = require('fs');
const path = require('path');
const { getUserDataPath } = require('./fileHelper');

// Simple logger to avoid console.log in production and structure logs.
// In a real app, use a library like Winston or Pino.

const isDev = process.env.NODE_ENV === 'development';

const log = (level, message, meta) => {
  const logEntry = {
    level,
    timestamp: new Date().toISOString(),
    message,
    ...(meta && { meta: meta.error instanceof Error ? { message: meta.error.message, stack: meta.error.stack } : meta }),
  };
  
  const output = JSON.stringify(logEntry);
  
  if (level === 'error') {
    console.error(output);
  } else if (level === 'warn') {
    console.warn(output);
  } else {
    // In dev, log plain text for readability
    if (isDev) {
      console.log(`[${level.toUpperCase()}] ${message}`, meta || '');
    } else {
      console.log(output);
    }
  }
};

const logger = {
  info: (message, meta) => log('info', message, meta),
  warn: (message, meta) => log('warn', message, meta),
  error: (message, meta) => log('error', message, meta),
};

module.exports = logger;
