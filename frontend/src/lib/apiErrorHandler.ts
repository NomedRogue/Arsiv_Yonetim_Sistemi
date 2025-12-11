// Central error handler for frontend API calls
import { toast } from '@/lib/toast';
import { errorLogger } from '@/lib/errorLogger';

interface ApiError {
  message: string;
  type?: string;
  statusCode?: number;
}

export const handleApiError = (
  error: unknown, 
  userMessage: string,
  severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'
): void => {
  // Log error for debugging and analytics
  errorLogger.logError(error, severity);
  
  // Extract meaningful error message
  let displayMessage = userMessage;
  
  // Type guard for error object
  if (error && typeof error === 'object') {
    const err = error as Record<string, any>;
    if (err.response?.data?.error) {
      displayMessage = err.response.data.error;
    } else if (err.message && typeof err.message === 'string') {
      displayMessage = err.message;
    }
  }
  
  // Show user-friendly toast
  toast.error(displayMessage);
  
  // Log to console in development
  if (import.meta.env.DEV) {
    console.error('[API ERROR]', {
      userMessage,
      error,
      severity,
      timestamp: new Date().toISOString()
    });
  }
};

export const handleApiSuccess = (message: string): void => {
  toast.success(message);
};

export const handleApiWarning = (message: string): void => {
  toast.warning(message);
};
