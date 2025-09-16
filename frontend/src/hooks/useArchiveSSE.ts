import { useEffect, Dispatch } from 'react';
import { ArchiveAction } from '@/types';
import { toast } from '@/lib/toast';

const API_BASE = (process.env as any).API_BASE;
const api = (p: string) => `${API_BASE}${p.startsWith('/') ? '' : '/'}${p}`;

export const useArchiveSSE = (dispatch: Dispatch<ArchiveAction>) => {
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

    return () => sse.close();
  }, [dispatch]);
};
