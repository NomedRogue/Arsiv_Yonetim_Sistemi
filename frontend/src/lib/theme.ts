// frontend/src/lib/theme.ts
// Theme type is now exported from ThemeContext
export type { Theme } from '@/context/ThemeContext';

// Merkezi Tema Renkleri - TÜM UYGULAMA
export const THEME_COLORS = {
  dark: {
    // Dashboard Card Icon Colors (Dark Mode)
    card: {
      primary: '#38BDF8',      // Daha canlı mavi (Sky 400)
      success: '#34D399',      // Emerald 400
      warning: '#FBBF24',      // Amber 400
      danger: '#F87171',       // Red 400
      orange: '#FB923C',       // Orange 400
      gray: '#9CA3AF',         // Gray 400
    },
    // Arşiv Doluluk Durumu - SVG Circle Stroke Colors
    occupancy: {
      critical: '#EF4444',    // Red 500
      warning: '#F59E0B',     // Amber 500
      moderate: '#3B82F6',    // Blue 500
      good: '#10B981',        // Emerald 500
      background: '#1E293B',  // Slate 800 - Daha koyu arka plan
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
      primary: '#2563EB',      // Mavi (Blue 600)
      success: '#059669',      // Yeşil (Emerald 600)
      warning: '#D97706',      // Sarı (Amber 600)
      danger: '#DC2626',       // Kırmızı (Red 600)
      orange: '#EA580C',       // Turuncu (Orange 600)
      gray: '#6B7280',         // Gri (Gray 600)
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
      tibbi: [
        '#059669', '#10B981', '#34D399', '#6EE7B7', // Emerald scale
        '#0D9488', '#14B8A6', '#2DD4BF', '#5EEAD4'  // Teal scale
      ],
      idari: [
        '#2563EB', '#3B82F6', '#60A5FA', '#93C5FD', // Blue scale
        '#0284C7', '#0EA5E9', '#38BDF8', '#7DD3FC'  // Sky scale (Replacing Indigo)
      ],
    },
    light: {
      tibbi: [
        '#047857', '#059669', '#10B981', '#34D399', 
        '#0F766E', '#0D9488', '#14B8A6', '#2DD4BF'
      ],
      idari: [
        '#1D4ED8', '#2563EB', '#3B82F6', '#60A5FA',
        '#0369A1', '#0284C7', '#0EA5E9', '#38BDF8'
      ],
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
          tibbi: '#34D399', 
          idari: '#60A5FA', 
        },
        categoryText: '#E2E8F0',
        itemText: '#F8FAFC',
        itemStroke: '#1E293B',
      },
      light: {
        categoryStroke: {
          tibbi: '#059669', 
          idari: '#2563EB', 
        },
        categoryText: '#1E293B',
        itemText: '#FFFFFF',
        itemStroke: '#FFFFFF',
      },
    },
  },
};

// Get department color for treemap based on rank/index (not just percentage)
// This ensures that even small items with similar percentages get different colors
// by cycling through the palette.
export function getDepartmentColor(theme: string, category: string, index: number, percentage: number = 0, allPercentages?: number[]): string {
  const isTibbi = category?.toLowerCase().includes('tıbbi') || category?.toLowerCase().includes('tibbi');
  // Güvenli tema ve kategori seçimi
  const safeTheme = theme === 'dark' ? 'dark' : 'light';
  const palette = isTibbi
    ? THEME_COLORS.departmentColors[safeTheme].tibbi
    : THEME_COLORS.departmentColors[safeTheme].idari;
  
  // RANK BASED COLORING (Index Mapping)
  // Treemaps often display largest items first. Even if not, mapping index to color
  // ensures that adjacent items (often similar in size) get different colors from the gradient sequence.
  // Using modulo ensures we cycle through the palette if we have more items than colors.
  
  return palette[index % palette.length];
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