import { useEffect } from 'react';

/**
 * Hook to handle SSE events for disposal-related changes
 * Listens to folder_created, folder_updated, folder_deleted events
 */
export const useDisposalSSE = (onFolderChange: () => void) => {
  useEffect(() => {
    const baseUrl = window.location.protocol === 'file:' ? 'http://localhost:3001' : '';
    const eventSource = new EventSource(`${baseUrl}/api/events`);

    const handleFolderChange = () => {
      onFolderChange();
    };

    eventSource.addEventListener('folder_created', handleFolderChange);
    eventSource.addEventListener('folder_updated', handleFolderChange);
    eventSource.addEventListener('folder_deleted', handleFolderChange);

    return () => {
      eventSource.close();
    };
  }, [onFolderChange]);
};
