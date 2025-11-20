import { useEffect, Dispatch } from 'react';
import { ArchiveAction } from '@/types';
import { toast } from '@/lib/toast';

// Electron'dan mı yoksa browser'dan mı çalıştığını kontrol et
const isElectron = window.location.protocol === 'file:' || navigator.userAgent.includes('Electron');

// Production'da (Electron) veya development'da doğru URL kullan
const api = (p: string) => {
  const baseUrl = isElectron ? 'http://localhost:3001/api' : '/api';
  return `${baseUrl}${p.startsWith('/') ? '' : '/'}${p}`;
};

export const useArchiveSSE = (dispatch: Dispatch<ArchiveAction>, refresh: () => Promise<void>) => {
  useEffect(() => {
    const sse = new EventSource(api('/events'));
    sse.onopen = () => dispatch({ type: 'SET_SSE_CONNECTED', payload: true });
    sse.onerror = () => dispatch({ type: 'SET_SSE_CONNECTED', payload: false });

    sse.addEventListener('backup', (e) => {
      const data = JSON.parse(e.data);
      dispatch({
        type: 'SET_LAST_BACKUP_EVENT',
        payload: { ...data, ts: new Date(data.ts) },
      });
      toast.info(`Yedekleme tamamlandı: ${data.path}`);
    });

    sse.addEventListener('backup_completed', (e) => {
      const data = JSON.parse(e.data);
      dispatch({
        type: 'SET_LAST_BACKUP_EVENT',
        payload: { ...data, ts: new Date(data.ts) },
      });
      
      // Otomatik yedekleme bildirimi
      if (data.type === 'Otomatik') {
        toast.success('Otomatik yedekleme tamamlandı');
      } else {
        toast.info(`Yedekleme tamamlandı: ${data.file}`);
      }
      
      // Logs listesini refresh et
      refresh();
    });

    sse.addEventListener('restore', (e) => {
      const data = JSON.parse(e.data);
      dispatch({
        type: 'SET_LAST_RESTORE_EVENT',
        payload: { ...data, ts: new Date(data.ts) },
      });
      toast.warning('Veritabanı geri yüklendi. Uygulama yenileniyor...');
      setTimeout(() => window.location.reload(), 2000);
    });

    sse.addEventListener('backup_cleanup', (e) => {
      const data = JSON.parse(e.data);
      dispatch({
        type: 'SET_LAST_BACKUP_CLEANUP_EVENT',
        payload: { ...data, ts: new Date(data.ts) },
      });
      toast.info(`${data.count} eski yedek dosyası silindi.`);
    });

    sse.addEventListener('backup_delete', (e) => {
      const data = JSON.parse(e.data);
      toast.success(`Yedek dosyası silindi: ${data.filename}`);
    });

    sse.addEventListener('departments_updated', (e) => {
      const data = JSON.parse(e.data);
      dispatch({
        type: 'SET_DEPARTMENTS',
        payload: data.departments,
      });
      toast.info('Birim bilgileri güncellendi.');
    });

    sse.addEventListener('storage_structure_updated', (e) => {
      const data = JSON.parse(e.data);
      dispatch({
        type: 'SET_STORAGE_STRUCTURE',
        payload: data.storageStructure,
      });
      toast.info('Depolama yapısı güncellendi.');
    });

    return () => sse.close();
  }, [dispatch, refresh]);
};
