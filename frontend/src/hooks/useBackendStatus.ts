import { useState, useEffect } from 'react';

export const useBackendStatus = () => {
  const [isBackendReady, setIsBackendReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let attempts = 0;
    const maxAttempts = 30; // 30 saniye boyunca dene
    
    const checkBackend = async () => {
      try {
        const response = await fetch('http://localhost:3001/api/health', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (response.ok) {
          setIsBackendReady(true);
          setIsLoading(false);
          setError(null);
          return;
        }
      } catch (err) {
        // Backend henüz hazır değil, devam et
      }
      
      attempts++;
      if (attempts >= maxAttempts) {
        setError('Backend server başlatılamadı. Lütfen uygulamayı yeniden başlatın.');
        setIsLoading(false);
        return;
      }
      
      // Hızlı tekrar deneme
      setTimeout(checkBackend, 250);
    };

    // Check immediately
    setTimeout(checkBackend, 100);
  }, []);

  return { isBackendReady, isLoading, error };
};