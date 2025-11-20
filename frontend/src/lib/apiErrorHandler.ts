// Central error handler for frontend API calls
import { toast } from '@/lib/toast';
import { errorLogger } from '@/lib/errorLogger';

interface ApiError {
  message: string;
  type?: string;
  statusCode?: number;
}

export const handleApiError = (
  error: any, 
  userMessage: string,
  severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'
): void => {
  // Log error for debugging and analytics
  errorLogger.logError(error, severity);
  
  // Extract meaningful error message
  let displayMessage = userMessage;
  
  if (error.response?.data?.error) {
    displayMessage = error.response.data.error;
  } else if (error.message) {
    displayMessage = error.message;
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
