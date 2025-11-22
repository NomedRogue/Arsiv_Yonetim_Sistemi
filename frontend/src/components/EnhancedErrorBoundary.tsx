import React, { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { errorLogger } from '../lib/errorLogger';

interface Props {
  children: ReactNode;
  fallbackComponent?: React.ComponentType<{ error: Error; resetErrorBoundary: () => void }>;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorId?: string;
}

export class EnhancedErrorBoundary extends React.Component<Props, State> {
  private resetTimeoutId: number | null = null;

  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { 
      hasError: true, 
      error,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log to our error logger
    errorLogger.logError(error, errorInfo.componentStack || undefined);
    
    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);
    
    // Auto-retry after 10 seconds for certain errors
    if (this.shouldAutoRetry(error)) {
      this.resetTimeoutId = window.setTimeout(() => {
        this.resetErrorBoundary();
      }, 10000);
    }
  }

  public componentWillUnmount() {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }
  }

  private shouldAutoRetry(error: Error): boolean {
    // Auto-retry for network errors or chunk load errors
    return error.message.includes('Loading chunk') || 
           error.message.includes('ChunkLoadError') ||
           error.message.includes('NetworkError');
  }

  private resetErrorBoundary = () => {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
      this.resetTimeoutId = null;
    }
    this.setState({ hasError: false, error: undefined, errorId: undefined });
  };

  private goHome = () => {
    window.location.href = '/';
  };

  private reloadPage = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError && this.state.error) {
      // Use custom fallback component if provided
      if (this.props.fallbackComponent) {
        const FallbackComponent = this.props.fallbackComponent;
        return <FallbackComponent error={this.state.error} resetErrorBoundary={this.resetErrorBoundary} />;
      }

      // Default fallback UI
      return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-slate-900 text-gray-800 dark:text-gray-200 p-4">
          <div className="text-center p-8 bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-2xl w-full">
            <AlertTriangle className="mx-auto h-20 w-20 text-red-500 mb-6" />
            
            <h1 className="text-3xl font-bold mb-4">Bir Sorun Oluştu</h1>
            
            <p className="text-lg text-gray-600 dark:text-gray-400 mb-6">
              Uygulamada beklenmedik bir hatayla karşılaşıldı. Bu sorun otomatik olarak raporlandı.
            </p>

            {/* Error ID for support */}
            <div className="bg-gray-100 dark:bg-slate-700 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                <strong>Hata ID:</strong> {this.state.errorId}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                Destek ekibiyle iletişime geçerken bu ID'yi paylaşın.
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
              <button
                onClick={this.resetErrorBoundary}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <RefreshCw style={{ width: '1.25em', height: '1.25em' }} />
                Yeniden Dene
              </button>
              
              <button
                onClick={this.reloadPage}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                <RefreshCw style={{ width: '1.25em', height: '1.25em' }} />
                Sayfayı Yenile
              </button>
              
              <button
                onClick={this.goHome}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Home style={{ width: '1.25em', height: '1.25em' }} />
                Ana Sayfaya Dön
              </button>
            </div>

            {/* Auto-retry notice */}
            {this.shouldAutoRetry(this.state.error) && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Bu hatanın otomatik olarak düzeltilmesi bekleniyor. 10 saniye içinde otomatik yeniden deneme yapılacak.
                </p>
              </div>
            )}

            {/* Development mode error details */}
            {process.env.NODE_ENV === 'development' && (
              <details className="mt-6 p-4 bg-gray-100 dark:bg-slate-700 rounded-lg text-left">
                <summary className="cursor-pointer font-medium text-lg mb-2">
                  Geliştirici Bilgileri
                </summary>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-red-600 dark:text-red-400 mb-2">Hata Mesajı:</h4>
                    <p className="text-sm bg-red-50 dark:bg-red-900/20 p-2 rounded border border-red-200 dark:border-red-800">
                      {this.state.error.message}
                    </p>
                  </div>
                  {this.state.error.stack && (
                    <div>
                      <h4 className="font-semibold text-red-600 dark:text-red-400 mb-2">Stack Trace:</h4>
                      <pre className="text-xs bg-gray-50 dark:bg-slate-800 p-3 rounded border overflow-auto max-h-64">
                        <code>{this.state.error.stack}</code>
                      </pre>
                    </div>
                  )}
                </div>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// HOC for wrapping components with error boundary
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallbackComponent?: React.ComponentType<{ error: Error; resetErrorBoundary: () => void }>
) {
  const WrappedComponent = (props: P) => (
    <EnhancedErrorBoundary fallbackComponent={fallbackComponent}>
      <Component {...props} />
    </EnhancedErrorBoundary>
  );
  
  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  return WrappedComponent;
}