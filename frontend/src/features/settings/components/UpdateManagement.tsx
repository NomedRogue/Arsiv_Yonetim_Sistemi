import React, { useState, useEffect } from 'react';
import { Download, RefreshCw, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

interface UpdateStatus {
  status: 'idle' | 'checking' | 'available' | 'downloading' | 'downloaded' | 'error';
  version?: string;
  message?: string;
  currentVersion?: string;
  progress?: {
    percent: number;
    transferred: number;
    total: number;
    bytesPerSecond: number;
  };
}

export const UpdateManagement: React.FC = () => {
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>({ status: 'idle' });
  const [isChecking, setIsChecking] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showProgressModal, setShowProgressModal] = useState(false);

  useEffect(() => {
    // Mevcut versiyonu al
    if (window.electronAPI?.updater) {
      window.electronAPI.updater.getVersion().then((version: string) => {
        setUpdateStatus(prev => ({ ...prev, currentVersion: version }));
      });

      // Güncelleme durumu dinleyicisi
      const cleanup = window.electronAPI.updater.onUpdateStatus((data: any) => {
        console.log('[UpdateStatus]', data);
        
        if (data.status === 'available') {
          setUpdateStatus(prev => ({
            status: 'available',
            version: data.version,
            currentVersion: prev.currentVersion
          }));
          setIsChecking(false);
        } else if (data.status === 'not-available') {
          setUpdateStatus(prev => ({ ...prev, status: 'idle' }));
          setIsChecking(false);
        } else if (data.status === 'downloading') {
          setUpdateStatus(prev => ({ 
            ...prev, 
            status: 'downloading',
            progress: data.progress 
          }));
          setIsDownloading(true);
          setShowProgressModal(true);
        } else if (data.status === 'downloaded') {
          setUpdateStatus(prev => ({
            status: 'downloaded',
            version: data.version,
            currentVersion: prev.currentVersion
          }));
          setIsDownloading(false);
          setShowProgressModal(false);
        } else if (data.status === 'error') {
          setUpdateStatus(prev => ({
            status: 'error',
            message: data.message,
            currentVersion: prev.currentVersion
          }));
          setIsChecking(false);
          setIsDownloading(false);
          setShowProgressModal(false);
        }
      });

      return cleanup;
    }
  }, []); 

  const handleCheckForUpdates = async () => {
    if (!window.electronAPI?.updater) return;

    setIsChecking(true);
    setUpdateStatus(prev => ({ ...prev, status: 'checking', message: undefined }));

    try {
      const result = await window.electronAPI.updater.checkForUpdates();
      if (!result.success) {
         // Hata durumunda event listener zaten yakalayacak
      }
    } catch (error: any) {
       // Hata durumunda event listener zaten yakalayacak
    }
  };

  const handleDownloadUpdate = async () => {
    if (!window.electronAPI?.updater) return;

    setIsDownloading(true);
    setUpdateStatus(prev => ({ ...prev, status: 'downloading' }));

    try {
      await window.electronAPI.updater.downloadUpdate();
    } catch (error: any) {
      setIsDownloading(false);
    }
  };

  const handleInstallUpdate = () => {
    if (!window.electronAPI?.updater) return;
    window.electronAPI.updater.installUpdate();
  };

  // Byte cinsinden boyutu formatla
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-4">
      {/* Versiyon Kartı */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-4 shadow-sm relative overflow-hidden">
        {/* Arkaplan Deseni */}
        <div className="absolute top-0 right-0 p-4 opacity-5 dark:opacity-10 pointer-events-none">
          <RefreshCw className="w-24 h-24" />
        </div>

        <div className="flex items-center justify-between relative z-10">
          <div>
            <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Yüklü Sürüm</h4>
            <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
              v{updateStatus.currentVersion || '...'}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                updateStatus.status === 'available' 
                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
                  : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
              }`}>
                {updateStatus.status === 'available' ? 'Güncelleme Mevcut' : 'Sistem Güncel'}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <button
              onClick={handleCheckForUpdates}
              disabled={isChecking || isDownloading}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-900 dark:bg-slate-700 text-white rounded-lg hover:bg-slate-800 dark:hover:bg-slate-600 disabled:opacity-50 transition-colors text-sm font-medium min-w-[160px]"
            >
              {isChecking ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              {isChecking ? 'Kontrol Ediliyor' : 'Kontrol Et'}
            </button>
            
            {updateStatus.status === 'available' && (
              <button
                onClick={handleDownloadUpdate}
                disabled={isDownloading}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 transition-colors text-sm font-medium min-w-[160px]"
              >
                {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                Git & İndir (v{updateStatus.version})
              </button>
            )}

            {updateStatus.status === 'downloaded' && (
              <button
                onClick={handleInstallUpdate}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium min-w-[160px]"
              >
                <CheckCircle className="w-4 h-4" />
                Yükle & Başlat
              </button>
            )}
          </div>
        </div>

        {/* Hata Mesajı */}
        {updateStatus.status === 'error' && (
          <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
             <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
             <div>
               <h5 className="text-sm font-semibold text-red-800 dark:text-red-300">Güncelleme Hatası</h5>
               <p className="text-xs text-red-700 dark:text-red-400 mt-1">{updateStatus.message}</p>
             </div>
          </div>
        )}
      </div>

      {/* İndirme İlerleme Modalı */}
      {showProgressModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl p-6 w-full max-w-md border dark:border-slate-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Download className="w-5 h-5 text-teal-600" />
              Güncelleme İndiriliyor
            </h3>
            
            <div className="space-y-4">
               {/* Progress Bar */}
               <div className="relative h-2 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                 <div 
                    className="absolute top-0 left-0 h-full bg-teal-600 transition-all duration-300 ease-out"
                    style={{ width: `${updateStatus.progress?.percent || 0}%` }}
                 />
               </div>
               
               {/* Stats */}
               <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                 <span>{formatBytes(updateStatus.progress?.transferred || 0)} / {formatBytes(updateStatus.progress?.total || 0)}</span>
                 <span>{updateStatus.progress?.percent.toFixed(1)}%</span>
               </div>
               
               <div className="text-xs text-gray-400 text-center">
                  Hız: {formatBytes(updateStatus.progress?.bytesPerSecond || 0)}/s
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
