import { useEffect } from 'react';
import { useArchive } from '@/context/ArchiveContext';

/**
 * Custom hook to handle SSE events for dashboard
 * Listens to folder, checkout, and backup events and triggers stats refresh
 */
export const useDashboardSSE = (onDataChange: () => void) => {
  const { sseConnected } = useArchive();

  useEffect(() => {
    if (!sseConnected) return;

    const baseUrl = window.location.protocol === 'file:' ? 'http://localhost:3001' : '';
    const eventSource = new EventSource(`${baseUrl}/api/events`);

    // Folder and checkout events trigger stats refresh
    const handleDataChange = () => {
      onDataChange();
    };

    eventSource.addEventListener('folder_created', handleDataChange);
    eventSource.addEventListener('folder_updated', handleDataChange);
    eventSource.addEventListener('folder_deleted', handleDataChange);
    eventSource.addEventListener('checkout_created', handleDataChange);
    eventSource.addEventListener('checkout_updated', handleDataChange);

    return () => {
      eventSource.close();
    };
  }, [sseConnected, onDataChange]);
};
