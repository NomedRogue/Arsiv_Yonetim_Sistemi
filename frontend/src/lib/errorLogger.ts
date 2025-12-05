// Global error logging utility
interface ErrorLog {
  timestamp: string;
  message: string;
  stack?: string;
  userAgent: string;
  url: string;
  componentStack?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  sessionId: string;
  userId?: string;
  breadcrumbs: BreadcrumbEntry[];
}

interface BreadcrumbEntry {
  timestamp: string;
  action: string;
  data?: any;
}

interface PerformanceMetrics {
  memory?: {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
  };
  timing?: {
    navigationStart: number;
    loadEventEnd: number;
  };
}

class ErrorLogger {
  private logs: ErrorLog[] = [];
  private breadcrumbs: BreadcrumbEntry[] = [];
  private maxLogs = 100;
  private maxBreadcrumbs = 50;
  private sessionId: string;

  constructor() {
    this.sessionId = this.generateSessionId();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  addBreadcrumb(action: string, data?: any): void {
    const breadcrumb: BreadcrumbEntry = {
      timestamp: new Date().toISOString(),
      action,
      data
    };

    this.breadcrumbs.unshift(breadcrumb);
    
    if (this.breadcrumbs.length > this.maxBreadcrumbs) {
      this.breadcrumbs = this.breadcrumbs.slice(0, this.maxBreadcrumbs);
    }
  }

  logError(error: Error, componentStack?: string, severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'): void {
    const errorLog: ErrorLog = {
      timestamp: new Date().toISOString(),
      message: error.message,
      stack: error.stack,
      userAgent: navigator.userAgent,
      url: window.location.href,
      componentStack,
      severity,
      sessionId: this.sessionId,
      breadcrumbs: [...this.breadcrumbs]
    };

    this.logs.unshift(errorLog);
    
    // Keep only the most recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs);
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error logged:', errorLog);
    }

    // Critical errors should be immediately reported
    if (severity === 'critical') {
      this.reportCriticalError(errorLog);
    }

    // In production, you could send to a remote logging service
    // this.sendToRemoteLogger(errorLog);
  }

  private reportCriticalError(errorLog: ErrorLog): void {
    // Store critical errors in localStorage for persistence
    try {
      const criticalErrors = JSON.parse(localStorage.getItem('criticalErrors') || '[]');
      criticalErrors.unshift(errorLog);
      localStorage.setItem('criticalErrors', JSON.stringify(criticalErrors.slice(0, 10)));
    } catch (e) {
      console.error('Failed to store critical error:', e);
    }
  }

  getPerformanceMetrics(): PerformanceMetrics {
    const metrics: PerformanceMetrics = {};

    // Memory usage (if available)
    if ('memory' in performance) {
      const memInfo = (performance as any).memory;
      metrics.memory = {
        usedJSHeapSize: memInfo.usedJSHeapSize,
        totalJSHeapSize: memInfo.totalJSHeapSize
      };
    }

    // Navigation timing
    if (performance.timing) {
      metrics.timing = {
        navigationStart: performance.timing.navigationStart,
        loadEventEnd: performance.timing.loadEventEnd
      };
    }

    return metrics;
  }

  logPerformanceIssue(metric: string, value: number, threshold: number): void {
    if (value > threshold) {
      this.logError(
        new Error(`Performance issue: ${metric} (${value}ms) exceeded threshold (${threshold}ms)`),
        undefined,
        'medium'
      );
    }
  }

  logUserAction(action: string, data?: any): void {
    if (process.env.NODE_ENV === 'development') {
      if (import.meta.env.DEV) console.log(`User Action: ${action}`, data);
    }
  }

  getRecentLogs(count: number = 10): ErrorLog[] {
    return this.logs.slice(0, count);
  }

  clearLogs(): void {
    this.logs = [];
  }

  // Future: Send logs to remote service
  private async sendToRemoteLogger(errorLog: ErrorLog): Promise<void> {
    try {
      // Implementation for sending logs to a remote service
      // await fetch('/api/logs', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(errorLog)
      // });
    } catch (err) {
      // Fail silently for logging errors
      console.warn('Failed to send error log to remote service:', err);
    }
  }
}

export const errorLogger = new ErrorLogger();

// Known errors to suppress (library issues that don't affect functionality)
const SUPPRESSED_ERRORS = [
  'dragEvent is not defined',  // Recharts internal error in production builds
  'ResizeObserver loop limit exceeded',  // Benign browser warning
  'ResizeObserver loop completed with undelivered notifications',  // Benign browser warning
];

function shouldSuppressError(message: string): boolean {
  return SUPPRESSED_ERRORS.some(suppressed => message.includes(suppressed));
}

// Global error handler for unhandled promises
window.addEventListener('unhandledrejection', (event) => {
  const errorMessage = String(event.reason);
  if (shouldSuppressError(errorMessage)) {
    console.debug('[SUPPRESSED] Unhandled Promise Rejection:', errorMessage);
    event.preventDefault();
    return;
  }
  errorLogger.logError(new Error(`Unhandled Promise Rejection: ${event.reason}`));
});

// Global error handler for uncaught errors
window.addEventListener('error', (event) => {
  if (shouldSuppressError(event.message)) {
    console.debug('[SUPPRESSED] Error:', event.message);
    event.preventDefault();
    return;
  }
  errorLogger.logError(new Error(event.message), `${event.filename}:${event.lineno}:${event.colno}`);
});