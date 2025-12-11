import { useEffect, useRef } from 'react';
import { useArchive } from '@/context/ArchiveContext';

/**
 * Hook to handle SSE events for disposal-related changes
 * Uses ArchiveContext's centralized SSE connection
 */
export const useDisposalSSE = (onFolderChange: () => void) => {
  const { sseConnected } = useArchive();
  const lastConnectedRef = useRef(sseConnected);
  
  // Only refresh when SSE connection is established (false -> true transition)
  useEffect(() => {
    // Only trigger on connection establishment, not on every render
    if (sseConnected && !lastConnectedRef.current) {
      onFolderChange();
    }
    lastConnectedRef.current = sseConnected;
  }, [sseConnected, onFolderChange]);
};
