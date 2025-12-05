import { useEffect, useRef } from 'react';
import { useArchive } from '@/context/ArchiveContext';

/**
 * Custom hook to handle SSE events for checkout changes
 * Uses ArchiveContext's centralized SSE connection instead of creating a new one
 */
export const useCheckoutSSE = (onCheckoutChange: () => void) => {
  const { sseConnected } = useArchive();
  const lastConnectedRef = useRef(sseConnected);
  
  // Only refresh when SSE connection is established (false -> true transition)
  useEffect(() => {
    if (sseConnected && !lastConnectedRef.current) {
      onCheckoutChange();
    }
    lastConnectedRef.current = sseConnected;
  }, [sseConnected, onCheckoutChange]);
};
