import React, { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorFallback extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-screen bg-gray-100 dark:bg-slate-900 text-gray-800 dark:text-gray-200">
            <div className="text-center p-8 bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-lg">
                <AlertTriangle className="mx-auto h-16 w-16 text-red-500" />
                <h1 className="mt-4 text-xl font-bold">Bir Hata Oluştu</h1>
                <p className="mt-2 text-gray-600 dark:text-gray-400">
                    Uygulamada beklenmedik bir sorunla karşılaşıldı. Lütfen sayfayı yenilemeyi deneyin veya geliştiriciyle iletişime geçin.
                </p>
                
                {/* Geliştirme modunda hatayı göster */}
                {process.env.NODE_ENV === 'development' && this.state.error && (
                    <details className="mt-4 p-2 bg-gray-100 dark:bg-slate-700 rounded text-left text-sm">
                        <summary className="cursor-pointer font-medium">Hata Detayları</summary>
                        <pre className="mt-2 whitespace-pre-wrap break-all">
                            <code>{this.state.error.stack}</code>
                        </pre>
                    </details>
                )}

                <button
                    onClick={() => window.location.reload()}
                    className="mt-6 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                    Sayfayı Yenile
                </button>
            </div>
        </div>
      );
    }

    return this.props.children;
  }
}