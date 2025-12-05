import { useEffect } from 'react';

/**
 * Custom hook to handle SSE events for checkout changes
 * Listens to checkout_created and checkout_updated events
 */
export const useCheckoutSSE = (onCheckoutChange: () => void) => {
  useEffect(() => {
    const baseUrl = import.meta.env.DEV ? '' : 'http://localhost:3001';
    const eventSource = new EventSource(`${baseUrl}/api/events`);
    
    const handleCheckoutChange = () => {
      onCheckoutChange();
    };
    
    eventSource.addEventListener('checkout_created', handleCheckoutChange);
    eventSource.addEventListener('checkout_updated', handleCheckoutChange);
    
    return () => {
      eventSource.close();
    };
  }, [onCheckoutChange]);
};
