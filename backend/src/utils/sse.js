const logger = require('./logger');
const { TIMEOUTS } = require('../config/constants');

const sseClients = new Set();

// Bağlantı ve interval yönetimi
const clients = new Set();
let intervalId = null;

// SSE Configuration from constants
const SSE_TIMEOUT = TIMEOUTS.SSE_TIMEOUT_MS;
const HEARTBEAT_INTERVAL = TIMEOUTS.SSE_HEARTBEAT_MS;
const PING_INTERVAL = TIMEOUTS.SSE_PING_MS;
const MAX_SSE_CLIENTS = TIMEOUTS.MAX_SSE_CLIENTS;

function addClient(res) {
  const client = {
    res,
    connectedAt: Date.now(),
    lastActivity: Date.now(),
  };
  
  clients.add(client);
  
  if (!intervalId) {
    intervalId = setInterval(() => {
      const now = Date.now();
      // Herkese ping gönder ve eski bağlantıları temizle
      clients.forEach(c => {
        try {
          // Timeout kontrolü
          if (now - c.lastActivity > SSE_TIMEOUT) {
            logger.info('[SSE] Client timeout, closing connection');
            c.res.end();
            clients.delete(c);
            return;
          }
          
          c.res.write(`data: ping\n\n`);
          c.lastActivity = now;
        } catch (err) {
          logger.error('[SSE PING ERROR]', { error: err });
          clients.delete(c);
        }
      });
      
      // Interval'ı temizle eğer client kalmadıysa
      if (clients.size === 0 && intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    }, HEARTBEAT_INTERVAL);
  }
  
  res.on('close', () => {
    clients.delete(client);
    if (clients.size === 0 && intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  });
}

/** Tüm abonelere event yayınla */
function sseBroadcast(type, payload = {}) {
  const data = JSON.stringify({ type, ...payload, ts: new Date().toISOString() });
  const frame = `event: ${type}\n` + `data: ${data}\n\n`;
  logger.info(`[SSE BROADCAST] ${type}:`, payload);
  for (const res of sseClients) {
    try { 
      res.write(frame); 
    } catch (e) {
      logger.error('[SSE WRITE ERROR]', { error: e });
      sseClients.delete(res);
    }
  }
}

function initSse(app) {
  app.get('/api/events', async (req, res, next) => {
    try {
      // Prevent too many concurrent connections (security)
      if (sseClients.size >= MAX_SSE_CLIENTS) {
        return res.status(503).json({ 
          error: 'Too many active connections. Please try again later.' 
        });
      }
      
      res.setHeader('Content-Type', 'text/event-stream');
      res.flushHeaders?.();
      res.write(`event: message\ndata: ${JSON.stringify({ type: 'connected', hello: true })}\n\n`);
      sseClients.add(res);
      addClient(res);
      logger.info(`[SSE] Client connected. Total: ${sseClients.size}`);

      const hb = setInterval(() => {
        try { 
          res.write(`event: ping\ndata: {}\n\n`); 
        } catch (_) {
          clearInterval(hb);
        }
      }, PING_INTERVAL);
      
      // Auto-cleanup timeout
      const cleanupTimeout = setTimeout(() => {
        logger.info('[SSE] Client connection timeout, closing');
        clearInterval(hb);
        sseClients.delete(res);
        try { 
          res.end(); 
        } catch (_) {}
      }, SSE_TIMEOUT);

      req.on('close', () => {
        clearInterval(hb);
        clearTimeout(cleanupTimeout);
        sseClients.delete(res);
        logger.info(`[SSE] Client disconnected. Total: ${sseClients.size}`);
        try { 
          res.end(); 
        } catch (_) {}
      });
    } catch (error) {
      logger.error('[SSE] Connection error:', error);
      next(error);
    }
  });
}

function sseCleanup() {
  // Tüm SSE bağlantılarını temizle
  for (const res of sseClients) {
    try {
      res.end();
    } catch (e) {
      // Ignore errors during cleanup
    }
  }
  sseClients.clear();
  
  // Client interval'larını temizle
  for (const client of clients) {
    try {
      client.res.end();
    } catch (e) {
      // Ignore errors during cleanup
    }
  }
  clients.clear();
  
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
  
  logger.info('[SSE] All connections closed and intervals cleared');
}

// Alias for graceful shutdown
const stopSse = sseCleanup;

module.exports = { sseBroadcast, initSse, sseCleanup, stopSse };