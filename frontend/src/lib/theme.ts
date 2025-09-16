// frontend/src/lib/theme.ts
export type Theme = 'light' | 'dark';

let themeChangeTimer: number;

// This function can be called once, right when the app loads.
// It is independent of React and applies the theme class instantly.
export function initTheme(): Theme {
  const storedTheme = window.localStorage.getItem('theme') as Theme | null;
  const preferredTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  const theme = storedTheme || preferredTheme;
  
  const root = window.document.documentElement;
  root.classList.remove('light', 'dark');
  root.classList.add(theme);

  return theme;
}

// This function handles changing the theme and persisting it.
export function applyTheme(theme: Theme) {
  const root = window.document.documentElement;
  
  // Add a class to disable transitions for an instantaneous switch
  root.classList.add('theme-changing');

  // Change the theme class
  root.classList.remove('light', 'dark');
  root.classList.add(theme);
  window.localStorage.setItem('theme', theme);

  // Remove the transition-disabling class after a brief moment.
  // This allows transitions to work for subsequent user interactions (e.g., hover).
  clearTimeout(themeChangeTimer);
  themeChangeTimer = window.setTimeout(() => {
    root.classList.remove('theme-changing');
  }, 10);
}