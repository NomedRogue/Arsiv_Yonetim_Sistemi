import { useState, useEffect } from 'react';
import { BackupRow } from '../types';
import { deleteBackup, getBackups, backupDbToFolder, restoreDbFromBackup } from '@/api';
import { handleApiError } from '@/lib/apiErrorHandler';
import { toast } from '@/lib/toast';

export const useBackupManagement = () => {
  const [backups, setBackups] = useState<BackupRow[]>([]);
  const [backupFolder, setBackupFolder] = useState<string>('');
  const [isRestoreModalOpen, setRestoreModalOpen] = useState(false);
  const [restoreFilename, setRestoreFilename] = useState('');
  const [isBackupDeleteModalOpen, setIsBackupDeleteModalOpen] = useState(false);
  const [pendingDeleteFilename, setPendingDeleteFilename] = useState('');

  // Load backup history on mount
  useEffect(() => {
    const loadBackups = async () => {
      try {
        const response = await getBackups();
        setBackups(response.backups || []);
        setBackupFolder(response.folder || '');
      } catch (error) {
        handleApiError(error, 'Yedekler yüklenemedi');
      }
    };
    loadBackups();
  }, []);

  const handleOpenRestoreModal = (filename: string) => {
    setRestoreFilename(filename);
    setRestoreModalOpen(true);
  };

  const handleRestoreBackup = async () => {
    try {
      // Main process veritabanı bağlantısını kapat (Dosya kilitlerini kaldırmak için)
      const electronAPI = (window as any).electronAPI;
      if (electronAPI?.db?.close) {
        await electronAPI.db.close();
      }

      await restoreDbFromBackup(restoreFilename);
      toast.success('Veritabanı başarıyla geri yüklendi! Uygulama yeniden başlatılıyor...');
      setRestoreModalOpen(false);

      // Başarılı olursa reconnect yapmaya gerek yok çünkü sayfa yenilenecek
      // Ama yine de iyi pratik:
      if (electronAPI?.db?.reconnect) {
         try { await electronAPI.db.reconnect(); } catch (e) { console.error(e); }
      }

      // Reload page after restore
      setTimeout(() => window.location.reload(), 1500);
    } catch (e: any) {
      // Hata durumunda veritabanını tekrar bağla
      const electronAPI = (window as any).electronAPI;
      if (electronAPI?.db?.reconnect) {
         try { await electronAPI.db.reconnect(); } catch (recErr) { console.error(recErr); }
      }

      toast.error(`Geri yükleme başarısız: ${e.message}`);
    }
  };

  const openBackupDeleteModal = (filename: string) => {
    setPendingDeleteFilename(filename);
    setIsBackupDeleteModalOpen(true);
  };

  const closeBackupDeleteModal = () => {
    setIsBackupDeleteModalOpen(false);
    setPendingDeleteFilename('');
  };

  const handleConfirmBackupDelete = async () => {
    if (!pendingDeleteFilename) return;
    try {
      await deleteBackup(pendingDeleteFilename);
      setBackups((prev) => prev.filter((b) => b.filename !== pendingDeleteFilename));
      toast.success('Yedek dosyası silindi.');
    } catch (error: any) {
      toast.error(`Yedek silme başarısız: ${error.message}`);
    } finally {
      closeBackupDeleteModal();
    }
  };

  const handleServerSideBackup = async () => {
    try {
      await backupDbToFolder();
      toast.success('Sunucu tarafında yedekleme başarıyla tamamlandı.');
      // Reload backup list
      const response = await getBackups();
      setBackups(response.backups || []);
    } catch (error: any) {
      toast.error(`Yedekleme başarısız: ${error.message}`);
    }
  };

  return {
    backups,
    backupFolder,
    isRestoreModalOpen,
    restoreFilename,
    isBackupDeleteModalOpen,
    pendingDeleteFilename,
    handleOpenRestoreModal,
    handleRestoreBackup,
    openBackupDeleteModal,
    closeBackupDeleteModal,
    handleConfirmBackupDelete,
    handleServerSideBackup,
    setRestoreModalOpen,
  };
};
