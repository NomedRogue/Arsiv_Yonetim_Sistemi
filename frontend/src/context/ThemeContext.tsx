import React, { createContext, useState, useEffect, useContext, ReactNode, useCallback } from 'react';

export type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  // Initialize theme from localStorage or system preference
  const getInitialTheme = (): Theme => {
    const stored = window.localStorage.getItem('theme') as Theme | null;
    if (stored) return stored;
    
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    return prefersDark ? 'dark' : 'light';
  };

  const [theme, setThemeState] = useState<Theme>(getInitialTheme);

  // Apply theme to DOM whenever it changes
  useEffect(() => {
    const root = window.document.documentElement;
    
    // Tema değişiminin anında gerçekleşmesi için geçişleri devre dışı bırak
    root.classList.add('theme-changing');
    
    // Remove both classes first
    root.classList.remove('light', 'dark');
    
    // Add the current theme class
    root.classList.add(theme);
    
    // Persist to localStorage
    window.localStorage.setItem('theme', theme);
    
    // Tema sınıfı eklendikten sonra DOM'un güncellenmesini bekle
    requestAnimationFrame(() => {
      // Bir sonraki frame'de theme-changing sınıfını kaldır
      requestAnimationFrame(() => {
        root.classList.remove('theme-changing');
      });
    });
    
    if (import.meta.env.DEV) {
      console.log('[ThemeProvider] Theme changed to:', theme);
    }
  }, [theme]);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState(current => current === 'light' ? 'dark' : 'light');
  }, []);

  const value: ThemeContextType = {
    theme,
    setTheme,
    toggleTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

// Custom hook to use theme context
export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
