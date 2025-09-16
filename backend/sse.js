const logger = require('./logger');

const sseClients = new Set();

// Bağlantı ve interval yönetimi
const clients = new Set();
let intervalId = null;

function addClient(res) {
  clients.add(res);
  if (!intervalId) {
    intervalId = setInterval(() => {
      // Herkese ping veya veri gönder
      clients.forEach(client => {
        client.write(`data: ping\n\n`);
      });
    }, 30000);
  }
  res.on('close', () => {
    clients.delete(res);
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
  app.get('/api/events', (req, res) => {
    res.set({
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    });
    res.flushHeaders?.();
    res.write(`event: message\ndata: ${JSON.stringify({ type: 'connected', hello: true })}\n\n`);
    sseClients.add(res);
    addClient(res);
    logger.info(`[SSE] Client connected. Total: ${sseClients.size}`);

    const hb = setInterval(() => {
      try { 
        res.write(`event: ping\ndata: {}\n\n`); 
      } catch (_) {}
    }, 25000);

    req.on('close', () => {
      clearInterval(hb);
      sseClients.delete(res);
      logger.info(`[SSE] Client disconnected. Total: ${sseClients.size}`);
      try { 
        res.end(); 
      } catch (_) {}
    });
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
      client.end();
    } catch (e) {
      // Ignore errors during cleanup
    }
  }
  clients.clear();
  
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

module.exports = { sseBroadcast, initSse, sseCleanup };