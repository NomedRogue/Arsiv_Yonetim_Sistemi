import { useState, useCallback } from 'react';
import { applyTheme, initTheme as initializeTheme, Theme } from '@/lib/theme';

export { initTheme } from '@/lib/theme';

// This hook syncs React state with the central theme module.
export const useTheme = (): [Theme, () => void] => {
  // Initialize state from the theme lib, which has already run
  // before React renders.
  const [theme, setTheme] = useState<Theme>(initializeTheme);

  const toggleTheme = useCallback(() => {
    // Use functional update to get the latest state
    setTheme((currentTheme) => {
      const newTheme = currentTheme === 'light' ? 'dark' : 'light';
      // Apply the theme to the DOM first for an instant change
      applyTheme(newTheme);
      // Then, return the new state for React
      return newTheme;
    });
  }, []);

  return [theme, toggleTheme];
};