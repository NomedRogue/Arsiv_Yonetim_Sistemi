import { useState, useEffect } from 'react';
import { Download, RefreshCw, CheckCircle, XCircle, X, Sparkles } from 'lucide-react';

interface UpdateStatus {
  status: 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error';
  version?: string;
  percent?: number;
  message?: string;
  releaseNotes?: string;
}

export default function UpdateNotification() {
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus | null>(null);
  const [currentVersion, setCurrentVersion] = useState<string>('');
  const [showNotification, setShowNotification] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  useEffect(() => {
    // Electron API kontrolü
    if (!window.electronAPI?.updater) {
      return;
    }

    // Mevcut versiyonu al
    window.electronAPI.updater.getVersion().then(setCurrentVersion);

    // Güncelleme durumunu dinle
    const cleanup = window.electronAPI.updater.onUpdateStatus((data) => {
      setUpdateStatus(data as UpdateStatus);
      
      // Güncelleme mevcutsa bildirimi göster
      if (data.status === 'available' || data.status === 'downloading' || data.status === 'downloaded') {
        setShowNotification(true);
        setIsMinimized(false);
      }
    });

    return cleanup;
  }, []);

  const handleDownload = async () => {
    if (window.electronAPI?.updater) {
      await window.electronAPI.updater.downloadUpdate();
    }
  };

  const handleInstall = () => {
    if (window.electronAPI?.updater) {
      window.electronAPI.updater.installUpdate();
    }
  };

  const handleCheckManually = async () => {
    if (window.electronAPI?.updater) {
      setUpdateStatus({ status: 'checking' });
      setShowNotification(true);
      await window.electronAPI.updater.checkForUpdates();
    }
  };

  const handleDismiss = () => {
    setShowNotification(false);
  };

  // Electron dışında çalışıyorsa gösterme
  if (!window.electronAPI?.updater) {
    return null;
  }

  // Bildirim kapalıysa küçük ikon göster
  if (!showNotification && updateStatus?.status === 'available') {
    return (
      <button
        onClick={() => setShowNotification(true)}
        className="fixed bottom-4 right-4 p-3 bg-teal-600 text-white rounded-full shadow-lg hover:bg-teal-700 transition-all animate-pulse z-50"
        title="Güncelleme mevcut"
      >
        <Sparkles className="w-5 h-5" />
      </button>
    );
  }

  if (!showNotification) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 text-white">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            <span className="font-medium text-sm">Güncelleme</span>
          </div>
          <button
            onClick={handleDismiss}
            className="p-1 hover:bg-white/20 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {updateStatus?.status === 'checking' && (
            <div className="flex items-center gap-3 text-gray-600 dark:text-gray-300">
              <RefreshCw className="w-5 h-5 animate-spin text-teal-500" />
              <span className="text-sm">Güncelleme kontrol ediliyor...</span>
            </div>
          )}

          {updateStatus?.status === 'not-available' && (
            <div className="flex items-center gap-3 text-green-600 dark:text-green-400">
              <CheckCircle className="w-5 h-5" />
              <div>
                <p className="text-sm font-medium">Uygulama güncel</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">v{currentVersion}</p>
              </div>
            </div>
          )}

          {updateStatus?.status === 'available' && (
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-teal-100 dark:bg-teal-900/50 rounded-lg">
                  <Download className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                </div>
                <div>
                  <p className="font-medium text-gray-800 dark:text-gray-200">
                    Yeni sürüm mevcut!
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    v{currentVersion} → v{updateStatus.version}
                  </p>
                </div>
              </div>
              <button
                onClick={handleDownload}
                className="w-full py-2 px-4 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                Güncellemeyi İndir
              </button>
            </div>
          )}

          {updateStatus?.status === 'downloading' && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <RefreshCw className="w-5 h-5 animate-spin text-teal-500" />
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  İndiriliyor... {updateStatus.percent?.toFixed(0)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                <div
                  className="bg-teal-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${updateStatus.percent || 0}%` }}
                />
              </div>
            </div>
          )}

          {updateStatus?.status === 'downloaded' && (
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/50 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="font-medium text-gray-800 dark:text-gray-200">
                    Güncelleme hazır!
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    v{updateStatus.version} yüklenmeye hazır
                  </p>
                </div>
              </div>
              <button
                onClick={handleInstall}
                className="w-full py-2 px-4 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Yeniden Başlat ve Güncelle
              </button>
              <p className="text-xs text-center text-gray-400">
                Uygulama kapanıp yeniden açılacak
              </p>
            </div>
          )}

          {updateStatus?.status === 'error' && (
            <div className="flex items-start gap-3 text-red-600 dark:text-red-400">
              <XCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium">Güncelleme hatası</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {updateStatus.message || 'Bağlantı kontrol edin'}
                </p>
                <button
                  onClick={handleCheckManually}
                  className="mt-2 text-xs text-teal-600 hover:underline"
                >
                  Tekrar dene
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer - Versiyon bilgisi */}
        <div className="px-4 py-2 bg-gray-50 dark:bg-slate-700/50 border-t border-gray-100 dark:border-slate-700">
          <p className="text-xs text-gray-400 text-center">
            Mevcut: v{currentVersion}
          </p>
        </div>
      </div>
    </div>
  );
}
