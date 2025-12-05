// frontend/src/lib/theme.ts
// Theme type is now exported from ThemeContext
export type { Theme } from '@/context/ThemeContext';

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
  // Department colors for treemap - comprehensive palette ensuring no black colors
  departmentColors: {
    dark: {
      tibbi: ['#064e3b', '#047857', '#059669', '#10b981', '#34d399', '#6ee7b7', '#a7f3d0', '#d1fae5'],
      idari: ['#1e40af', '#1d4ed8', '#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe', '#dbeafe'],
    },
    light: {
      tibbi: ['#a7f3d0', '#6ee7b7', '#34d399', '#10b981', '#059669', '#047857', '#065f46', '#064e3b'],
      idari: ['#dbeafe', '#bfdbfe', '#93c5fd', '#60a5fa', '#3b82f6', '#2563eb', '#1d4ed8', '#1e40af'],
    },
  },
  // Chart color palettes
  charts: {
    // Sunburst/Pie chart colors - vivid palette
    sunburst: [
      '#8884d8', '#83a6ed', '#8dd1e1', '#82ca9d', '#a4de6c',
      '#d0ed57', '#ffc658', '#fd7f6f', '#7eb0d5', '#b2e061',
      '#ffb55a', '#ffee65', '#beb9db', '#fdcce5', '#8bd3c7',
    ],
    // Treemap depth1 category colors
    treemap: {
      dark: {
        categoryStroke: {
          tibbi: '#10b981', // Green for medical
          idari: '#3b82f6', // Blue for administrative
        },
        categoryText: '#f1f5f9',
        itemText: '#ffffff',
        itemStroke: '#334155',
      },
      light: {
        categoryStroke: {
          tibbi: '#059669', // Green for medical
          idari: '#2563eb', // Blue for administrative
        },
        categoryText: '#1e293b',
        itemText: '#ffffff',
        itemStroke: '#ffffff',
      },
    },
  },
};

// Get department color for treemap based on percentage (higher % = darker color)
// Her departman index'ine göre palette'ten farklı ton alır
export function getDepartmentColor(theme: string, category: string, index: number, percentage?: number, allPercentages?: number[]): string {
  const isTibbi = category?.toLowerCase().includes('tıbbi') || category?.toLowerCase().includes('tibbi');
  const palette = isTibbi
    ? THEME_COLORS.departmentColors[theme === 'dark' ? 'dark' : 'light'].tibbi
    : THEME_COLORS.departmentColors[theme === 'dark' ? 'dark' : 'light'].idari;
  
  // Index bazlı renk seçimi - her departman palette boyunca dağıtılır
  // Bu sayede her departman farklı bir ton alır (koyu → açık veya açık → koyu)
  const colorIndex = index % palette.length;
  
  return palette[colorIndex];
}

// Get chart colors by type
export function getChartColors(type: 'sunburst'): string[] {
  if (type === 'sunburst') {
    return THEME_COLORS.charts.sunburst;
  }
  return [];
}

// Get PIE chart colors based on theme and occupancy
export function getPieChartColors(theme: string, occupancyRate: number): string[] {
  const isDark = theme === 'dark';
  
  const colors = isDark ? {
    empty: '#10B981', // Green for available space
    used: occupancyRate > 80 ? '#EF4444' : occupancyRate > 60 ? '#F59E0B' : '#6B7280'
  } : {
    empty: '#059669', // Green for available space
    used: occupancyRate > 80 ? '#DC2626' : occupancyRate > 60 ? '#D97706' : '#6B7280'
  };
  
  return [colors.used, colors.empty];
}

// Get treemap colors based on theme
export function getTreemapColors(theme: string, category: string, isDepth1: boolean = false) {
  const isTibbi = category?.toLowerCase().includes('tıbbi') || category?.toLowerCase().includes('tibbi');
  const colors = THEME_COLORS.charts.treemap[theme === 'dark' ? 'dark' : 'light'];
  
  if (isDepth1) {
    return {
      stroke: isTibbi ? colors.categoryStroke.tibbi : colors.categoryStroke.idari,
      text: colors.categoryText,
    };
  }
  
  return {
    stroke: colors.itemStroke,
    text: colors.itemText,
  };
}

// Dashboard Card renk mapping (title'a göre doğru rengi döndür)
export function getCardIconColor(theme: string, title: string): string {
  const colors = THEME_COLORS[theme === 'dark' ? 'dark' : 'light'].card;
  
  if (title.includes('Toplam') || title.includes('İdari')) return colors.primary;
  if (title.includes('Tıbbi')) return colors.success;
  if (title.includes('Arşiv Dışında')) return colors.warning;
  if (title.includes('İade Geciken') || title.includes('İmha Süresi')) return colors.danger;
  if (title.includes('İmha Edilecek')) return colors.orange;
  if (title.includes('İmha Edilen')) return colors.gray;
  
  return colors.primary; // Varsayılan
}

// Helper function to get occupancy color based on percentage
export function getOccupancyColor(theme: string, occupancy: number): string {
  const colors = THEME_COLORS[theme === 'dark' ? 'dark' : 'light'].occupancy;
  if (occupancy > 85) return colors.critical;
  if (occupancy > 70) return colors.warning;
  if (occupancy > 50) return colors.moderate;
  return colors.good;
}

// Helper function to get occupancy text class based on percentage
export function getOccupancyTextClass(theme: string, occupancy: number): string {
  const classes = THEME_COLORS[theme === 'dark' ? 'dark' : 'light'].occupancyText;
  if (occupancy > 85) return classes.critical;
  if (occupancy > 70) return classes.warning;
  if (occupancy > 50) return classes.moderate;
  return classes.good;
}