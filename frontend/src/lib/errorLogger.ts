// Global error logging utility
interface ErrorLog {
  timestamp: string;
  message: string;
  stack?: string;
  userAgent: string;
  url: string;
  componentStack?: string;
}

class ErrorLogger {
  private logs: ErrorLog[] = [];
  private maxLogs = 100;

  logError(error: Error, componentStack?: string): void {
    const errorLog: ErrorLog = {
      timestamp: new Date().toISOString(),
      message: error.message,
      stack: error.stack,
      userAgent: navigator.userAgent,
      url: window.location.href,
      componentStack
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

    // In production, you could send to a remote logging service
    // this.sendToRemoteLogger(errorLog);
  }

  logUserAction(action: string, data?: any): void {
    if (process.env.NODE_ENV === 'development') {
      console.log(`User Action: ${action}`, data);
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

// Global error handler for unhandled promises
window.addEventListener('unhandledrejection', (event) => {
  errorLogger.logError(new Error(`Unhandled Promise Rejection: ${event.reason}`));
});

// Global error handler for uncaught errors
window.addEventListener('error', (event) => {
  errorLogger.logError(new Error(event.message), `${event.filename}:${event.lineno}:${event.colno}`);
});