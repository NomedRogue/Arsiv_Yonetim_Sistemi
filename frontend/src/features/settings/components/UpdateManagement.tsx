import React, { useState, useEffect } from 'react';
import { Download, RefreshCw, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from '@/lib/toast';

interface UpdateStatus {
  status: 'idle' | 'checking' | 'available' | 'downloading' | 'downloaded' | 'error';
  version?: string;
  message?: string;
  currentVersion?: string;
}

export const UpdateManagement: React.FC = () => {
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>({ status: 'idle' });
  const [isChecking, setIsChecking] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    // Mevcut versiyonu al
    if (window.electronAPI?.updater) {
      window.electronAPI.updater.getVersion().then((version: string) => {
        setUpdateStatus(prev => ({ ...prev, currentVersion: version }));
      });

      // Güncelleme durumu dinleyicisi
      const cleanup = window.electronAPI.updater.onUpdateStatus((data: any) => {
        if (data.status === 'available') {
          setUpdateStatus(prev => ({
            status: 'available',
            version: data.version,
            currentVersion: prev.currentVersion
          }));
          setIsChecking(false);
          toast.info(`Yeni sürüm mevcut: ${data.version}`);
        } else if (data.status === 'not-available') {
          setUpdateStatus(prev => ({ ...prev, status: 'idle' }));
          setIsChecking(false);
          toast.info('Uygulamanız güncel. Yeni güncelleme bulunmamaktadır.');
        } else if (data.status === 'downloading') {
          setUpdateStatus(prev => ({ ...prev, status: 'downloading' }));
          setIsDownloading(true);
        } else if (data.status === 'downloaded') {
          setUpdateStatus(prev => ({
            status: 'downloaded',
            version: data.version,
            currentVersion: prev.currentVersion
          }));
          setIsDownloading(false);
          toast.success('Güncelleme indirildi! Yüklemek için butona tıklayın.');
        } else if (data.status === 'error') {
          // 404 hatasını kullanıcı dostu bir mesajla göster
          const is404 = data.message && (data.message.includes('404') || data.message.includes('no published versions'));
          
          if (is404) {
            // 404 durumunu da HATA olarak göster (Token/Repo sorunu olabilir)
            setUpdateStatus(prev => ({
              status: 'error',
              message: data.message, // Backend'den gelen detaylı mesaj
              currentVersion: prev.currentVersion
            }));
            setIsChecking(false);
            setIsDownloading(false);
            toast.error(`Erişim Hatası: ${data.message}`);
          } else {
            // Gerçek hata durumunda error göster
            setUpdateStatus(prev => ({
              status: 'error',
              message: data.message,
              currentVersion: prev.currentVersion
            }));
            setIsChecking(false);
            setIsDownloading(false);
            toast.error(`Güncelleme hatası: ${data.message}`);
          }
        }
      });

      return cleanup;
    }
  }, []); // Boş dependency array - sonsuz döngüyü önler

  const handleCheckForUpdates = async () => {
    if (!window.electronAPI?.updater) {
      toast.error('Güncelleme servisi kullanılamıyor');
      return;
    }

    setIsChecking(true);
    setUpdateStatus(prev => ({ ...prev, status: 'checking' }));

    try {
      const result = await window.electronAPI.updater.checkForUpdates();
      if (!result.success) {
        // 404 veya "no published versions" hatası mı kontrol et
        const is404 = result.error && (
          result.error.includes('404') || 
          result.error.includes('no published versions') ||
          result.error.includes('Yayınlanmış güncelleme bulunamadı')
        );
        
        if (is404) {
          // 404'ü HATA olarak fırlat
          throw new Error(result.error || 'Erişim reddedildi (404)');
        } else {
          // Gerçek hata
          throw new Error(result.error || 'Güncelleme kontrolü başarısız');
        }
      }
    } catch (error: any) {
      // Sadece gerçek hatalar için error status göster
      const is404 = error.message && (
        error.message.includes('404') || 
        error.message.includes('no published versions') ||
        error.message.includes('Yayınlanmış güncelleme bulunamadı')
      );
      
      if (!is404) {
        setUpdateStatus(prev => ({
          status: 'error',
          message: error.message,
          currentVersion: prev.currentVersion
        }));
        setIsChecking(false);
        // Sadece gerçek hatalar için toast göster
        toast.error(`Güncelleme kontrolü başarısız: ${error.message}`);
      } else {
        // 404 ise de göster
        setUpdateStatus(prev => ({
          status: 'error',
          message: error.message,
          currentVersion: prev.currentVersion
        }));
        setIsChecking(false);
        toast.error(`Erişim Hatası (404): ${error.message}`);
      }
    }
  };

  const handleDownloadUpdate = async () => {
    if (!window.electronAPI?.updater) {
      toast.error('Güncelleme servisi kullanılamıyor');
      return;
    }

    setIsDownloading(true);
    toast.info('Güncelleme indiriliyor...');

    try {
      const result = await window.electronAPI.updater.downloadUpdate();
      if (!result.success) {
        throw new Error(result.error || 'İndirme başarısız');
      }
    } catch (error: any) {
      setIsDownloading(false);
      toast.error(`İndirme hatası: ${error.message}`);
    }
  };

  const handleInstallUpdate = () => {
    if (!window.electronAPI?.updater) {
      toast.error('Güncelleme servisi kullanılamıyor');
      return;
    }

    toast.info('Uygulama yeniden başlatılıyor...');
    window.electronAPI.updater.installUpdate();
  };

  return (
    <div className="space-y-3 xl:space-y-4">
      {/* Versiyon Bilgisi */}
      <div className="p-3 xl:p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg border border-gray-200 dark:border-slate-600">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-semibold text-xs xl:text-sm text-gray-800 dark:text-white mb-0.5 xl:mb-1">Mevcut Sürüm</h4>
            <p className="text-base xl:text-lg font-bold text-teal-600 dark:text-teal-400">
              v{updateStatus.currentVersion || '...'}
            </p>
          </div>
          {updateStatus.status === 'available' && (
            <div className="text-right">
              <p className="text-xs xl:text-sm text-gray-600 dark:text-gray-400 mb-0.5 xl:mb-1">Yeni Sürüm</p>
              <p className="text-base xl:text-lg font-bold text-orange-600 dark:text-orange-400">
                v{updateStatus.version}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Durum Mesajı */}
      {updateStatus.status === 'checking' && (
        <div className="flex items-center gap-2 p-2 xl:p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <Loader2 className="w-4 h-4 xl:w-5 xl:h-5 text-blue-600 dark:text-blue-400 animate-spin" />
          <span className="text-xs xl:text-sm text-blue-700 dark:text-blue-300">Güncellemeler kontrol ediliyor...</span>
        </div>
      )}

      {updateStatus.status === 'downloading' && (
        <div className="flex items-center gap-2 p-2 xl:p-3 bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800 rounded-lg">
          <Loader2 className="w-4 h-4 xl:w-5 xl:h-5 text-teal-600 dark:text-teal-400 animate-spin" />
          <span className="text-xs xl:text-sm text-teal-700 dark:text-teal-300">Güncelleme indiriliyor...</span>
        </div>
      )}

      {updateStatus.status === 'downloaded' && (
        <div className="flex items-center gap-2 p-2 xl:p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <CheckCircle className="w-4 h-4 xl:w-5 xl:h-5 text-green-600 dark:text-green-400" />
          <span className="text-xs xl:text-sm text-green-700 dark:text-green-300">
            Güncelleme hazır! Yüklemek için butona tıklayın.
          </span>
        </div>
      )}

      {updateStatus.status === 'error' && (
        <div className="flex items-center gap-2 p-2 xl:p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertCircle className="w-4 h-4 xl:w-5 xl:h-5 text-red-600 dark:text-red-400" />
          <span className="text-xs xl:text-sm text-red-700 dark:text-red-300">
            Hata: {updateStatus.message || 'Bilinmeyen hata'}
          </span>
        </div>
      )}

      {/* Aksiyon Butonları */}
      <div className="flex gap-2 xl:gap-3">
        <button
          onClick={handleCheckForUpdates}
          disabled={isChecking || isDownloading}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-1.5 xl:px-4 xl:py-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-xs xl:text-sm font-medium"
        >
          {isChecking ? (
            <Loader2 className="w-4 h-4 xl:w-5 xl:h-5 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4 xl:w-5 xl:h-5" />
          )}
          Güncellemeleri Kontrol Et
        </button>

        {updateStatus.status === 'available' && (
          <button
            onClick={handleDownloadUpdate}
            disabled={isDownloading}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-1.5 xl:px-4 xl:py-2.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-xs xl:text-sm font-medium"
          >
            {isDownloading ? (
              <Loader2 className="w-4 h-4 xl:w-5 xl:h-5 animate-spin" />
            ) : (
              <Download className="w-4 h-4 xl:w-5 xl:h-5" />
            )}
            Güncellemeyi İndir
          </button>
        )}

        {updateStatus.status === 'downloaded' && (
          <button
            onClick={handleInstallUpdate}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-1.5 xl:px-4 xl:py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-xs xl:text-sm font-medium"
          >
            <CheckCircle className="w-4 h-4 xl:w-5 xl:h-5" />
            Güncellemeyi Yükle ve Yeniden Başlat
          </button>
        )}
      </div>

      {/* Bilgilendirme */}
      <div className="p-2 xl:p-3 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800/30 rounded-lg">
        <p className="text-[10px] xl:text-xs text-blue-700 dark:text-blue-300">
          <strong>Not:</strong> Güncelleme yüklendiğinde uygulama otomatik olarak yeniden başlatılacaktır. 
          Lütfen tüm işlemlerinizi kaydettiğinizden emin olun.
        </p>
      </div>
    </div>
  );
};
