// frontend/src/lib/theme.ts
export type Theme = 'light' | 'dark';

let themeChangeTimer: number;

// Merkezi Tema Renkleri - TÜM UYGULAMA
export const THEME_COLORS = {
  dark: {
    // Dashboard Card Icon Colors (Dark Mode)
    card: {
      primary: '#60A5FA',      // Mavi (Toplam Klasör, İdari)
      success: '#34D399',      // Yeşil (Tıbbi)
      warning: '#FBBF24',      // Sarı (Arşiv Dışında)
      danger: '#F87171',       // Kırmızı (İade Geciken, İmha Süresi Geçenler)
      orange: '#FB923C',       // Turuncu (Bu Yıl İmha, Gelecek Yıl İmha)
      gray: '#9CA3AF',         // Gri (İmha Edilen)
    },
    // Arşiv Doluluk Durumu - SVG Circle Stroke Colors
    occupancy: {
      critical: '#DC2626',    // >85% - Kırmızı (Koyu)
      warning: '#F59E0B',     // >70% - Turuncu (Koyu)
      moderate: '#3B82F6',    // >50% - Mavi (Koyu)
      good: '#10B981',        // <=50% - Yeşil (Koyu)
      background: '#475569',  // Arka plan çember
    },
    // Text Colors for Percentages
    occupancyText: {
      critical: 'text-red-400',
      warning: 'text-amber-400',
      moderate: 'text-blue-400',
      good: 'text-emerald-400',
    },
  },
  light: {
    // Dashboard Card Icon Colors (Light Mode)
    card: {
      primary: '#3B82F6',      // Mavi (Toplam Klasör, İdari)
      success: '#10B981',      // Yeşil (Tıbbi)
      warning: '#F59E0B',      // Sarı (Arşiv Dışında)
      danger: '#EF4444',       // Kırmızı (İade Geciken, İmha Süresi Geçenler)
      orange: '#F97316',       // Turuncu (Bu Yıl İmha, Gelecek Yıl İmha)
      gray: '#6B7280',         // Gri (İmha Edilen)
    },
    // Arşiv Doluluk Durumu - SVG Circle Stroke Colors
    occupancy: {
      critical: '#EF4444',    // >85% - Kırmızı (Açık)
      warning: '#F59E0B',     // >70% - Turuncu (Açık)
      moderate: '#60A5FA',    // >50% - Mavi (Açık)
      good: '#34D399',        // <=50% - Yeşil (Açık)
      background: '#D1D5DB',  // Arka plan çember
    },
    // Text Colors for Percentages
    occupancyText: {
      critical: 'text-red-600',
      warning: 'text-amber-600',
      moderate: 'text-blue-600',
      good: 'text-emerald-600',
    },
  },
};

// Dashboard Card renk mapping (title'a göre doğru rengi döndür)
export function getCardIconColor(theme: Theme, title: string): string {
  const colors = THEME_COLORS[theme].card;
  
  if (title.includes('Toplam') || title.includes('İdari')) return colors.primary;
  if (title.includes('Tıbbi')) return colors.success;
  if (title.includes('Arşiv Dışında')) return colors.warning;
  if (title.includes('İade Geciken') || title.includes('İmha Süresi')) return colors.danger;
  if (title.includes('İmha Edilecek')) return colors.orange;
  if (title.includes('İmha Edilen')) return colors.gray;
  
  return colors.primary; // Varsayılan
}

// Helper function to get occupancy color based on percentage
export function getOccupancyColor(theme: Theme, occupancy: number): string {
  const colors = THEME_COLORS[theme].occupancy;
  if (occupancy > 85) return colors.critical;
  if (occupancy > 70) return colors.warning;
  if (occupancy > 50) return colors.moderate;
  return colors.good;
}

// Helper function to get occupancy text class based on percentage
export function getOccupancyTextClass(theme: Theme, occupancy: number): string {
  const classes = THEME_COLORS[theme].occupancyText;
  if (occupancy > 85) return classes.critical;
  if (occupancy > 70) return classes.warning;
  if (occupancy > 50) return classes.moderate;
  return classes.good;
}

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

  // Force reflow to ensure the class change takes effect immediately
  root.offsetHeight;

  // IMMEDIATELY dispatch theme-changed event for React components
  const event = new CustomEvent('theme-changed', { detail: { theme } });
  window.dispatchEvent(event);

  // Remove the transition-disabling class after a brief moment.
  // This allows transitions to work for subsequent user interactions (e.g., hover).
  clearTimeout(themeChangeTimer);
  themeChangeTimer = window.setTimeout(() => {
    root.classList.remove('theme-changing');
  }, 50);
}