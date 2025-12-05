// Rate limiting middleware to prevent DOS attacks
const logger = require('../utils/logger');

// Simple in-memory rate limiter
class RateLimiter {
  constructor(windowMs, maxRequests) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
    this.requests = new Map(); // IP -> [{timestamp}]
    
    // Cleanup old entries every minute
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
    
    // Ensure interval doesn't prevent process exit
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }
  
  // Stop the cleanup interval (for graceful shutdown)
  stop() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.requests.clear();
  }
  
  cleanup() {
    const now = Date.now();
    for (const [ip, timestamps] of this.requests.entries()) {
      const validTimestamps = timestamps.filter(ts => now - ts < this.windowMs);
      if (validTimestamps.length === 0) {
        this.requests.delete(ip);
      } else {
        this.requests.set(ip, validTimestamps);
      }
    }
  }
  
  isAllowed(ip) {
    const now = Date.now();
    const timestamps = this.requests.get(ip) || [];
    
    // Remove expired timestamps
    const validTimestamps = timestamps.filter(ts => now - ts < this.windowMs);
    
    if (validTimestamps.length >= this.maxRequests) {
      return false;
    }
    
    validTimestamps.push(now);
    this.requests.set(ip, validTimestamps);
    return true;
  }
  
  middleware() {
    return (req, res, next) => {
      const ip = req.ip || req.connection.remoteAddress;
      
      if (!this.isAllowed(ip)) {
        logger.warn(`[RATE LIMIT] IP blocked: ${ip}`);
        return res.status(429).json({ 
          error: 'Too many requests. Please try again later.',
          retryAfter: Math.ceil(this.windowMs / 1000)
        });
      }
      
      next();
    };
  }
}

// Predefined rate limiters
const uploadLimiter = new RateLimiter(15 * 60 * 1000, 50); // 50 uploads per 15 min
const apiLimiter = new RateLimiter(1 * 60 * 1000, 100); // 100 requests per minute
const strictLimiter = new RateLimiter(15 * 60 * 1000, 10); // 10 requests per 15 min (for sensitive ops)

module.exports = {
  RateLimiter,
  uploadLimiter: uploadLimiter.middleware(),
  apiLimiter: apiLimiter.middleware(),
  strictLimiter: strictLimiter.middleware()
};
