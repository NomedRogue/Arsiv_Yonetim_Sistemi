/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}"
  ],
  darkMode: "class",
  theme: {
    extend: {
      screens: {
        'xs': '480px',   // Extra small devices
        '3xl': '120rem', // 1920px - REM based ultra-wide
      },
      spacing: {
        // 8px grid system - REM based
        '0.5': '0.125rem',  // 2px
        '1': '0.25rem',     // 4px
        '2': '0.5rem',      // 8px
        '3': '0.75rem',     // 12px
        '4': '1rem',        // 16px
        '5': '1.25rem',     // 20px
        '6': '1.5rem',      // 24px
        '7': '1.75rem',     // 28px
        '8': '2rem',        // 32px
        '10': '2.5rem',     // 40px
        '12': '3rem',       // 48px
        '14': '3.5rem',     // 56px
        '16': '4rem',       // 64px
        '18': '4.5rem',     // 72px
        '20': '5rem',       // 80px
        '24': '6rem',       // 96px
        '32': '8rem',       // 128px
        '40': '10rem',      // 160px
        '48': '12rem',      // 192px
        '56': '14rem',      // 224px
        '64': '16rem',      // 256px
      },
      fontSize: {
        // Fluid typography scale - REM based
        '2xs': 'clamp(0.625rem, 0.6rem + 0.1vw, 0.75rem)',      // 10-12px
        'xs': 'clamp(0.75rem, 0.7rem + 0.15vw, 0.875rem)',      // 12-14px
        'sm': 'clamp(0.875rem, 0.8125rem + 0.25vw, 1rem)',      // 14-16px
        'base': 'clamp(1rem, 0.95rem + 0.3vw, 1.125rem)',       // 16-18px
        'lg': 'clamp(1.125rem, 1.05rem + 0.4vw, 1.5rem)',       // 18-24px
        'xl': 'clamp(1.25rem, 1.15rem + 0.5vw, 1.875rem)',      // 20-30px
        '2xl': 'clamp(1.5rem, 1.35rem + 0.75vw, 2.25rem)',      // 24-36px
        '3xl': 'clamp(1.875rem, 1.65rem + 1vw, 3rem)',          // 30-48px
      },
      minHeight: {
        'header': 'var(--header-height)',
        'card': 'var(--card-min-height)',
        'chart': 'var(--chart-min-height)',
      },
      height: {
        'header': 'var(--header-height)',
      },
      width: {
        'sidebar': 'var(--sidebar-width)',
        'sidebar-collapsed': 'var(--sidebar-collapsed)',
      },
      maxWidth: {
        'container-sm': '36rem',
        'container-md': '48rem',
        'container-lg': '64rem',
        'container-xl': '80rem',
        'container-2xl': '96rem',
        'container-full': '120rem',
      },
      borderRadius: {
        'sm': '0.375rem',
        'DEFAULT': '0.5rem',
        'md': '0.5rem',
        'lg': '0.75rem',
        'xl': '1rem',
        '2xl': '1.5rem',
      },
      colors: {
        // Hospital Theme Palette
        "archive-primary": "#0F766E", // Teal-700
        "archive-secondary": "#CCFBF1", // Teal-100
        "archive-accent": "#0D9488", // Teal-600 (Action buttons)
        
        // Backgrounds
        "archive-light-bg": "#F0F9FF", // Light Blue-50 (Softer than gray)
        "archive-dark-bg": "#0F172A", // Slate-900
        "archive-dark-panel": "#1E293B", // Slate-800
        
        // Text
        "archive-dark-text": "#F1F5F9", // Slate-100
        "archive-light-text": "#1E293B", // Slate-800
        "archive-muted-text": "#64748B", // Slate-500

        // Status Colors (Hospital Standard)
        "status-green": "#10B981", // Emerald-500
        "status-yellow": "#F59E0B", // Amber-500
        "status-red": "#EF4444", // Red-500
        "status-orange": "#F97316", // Orange-500
        "status-blue": "#3B82F6", // Blue-500

        // Chart colors for different themes
        "chart-light": {
          "primary": "#0F766E",
          "secondary": "#CCFBF1",
          "accent": "#0D9488",
          "success": "#10B981",
          "warning": "#F59E0B"
        },
        "chart-dark": {
          "primary": "#14B8A6",
          "secondary": "#0F172A",
          "accent": "#2DD4BF",
          "success": "#34D399",
          "warning": "#FBBF24"
        }
      },
      gap: {
        'fluid-xs': 'var(--space-fluid-xs)',
        'fluid-sm': 'var(--space-fluid-sm)',
        'fluid-md': 'var(--space-fluid-md)',
        'fluid-lg': 'var(--space-fluid-lg)',
        'fluid-xl': 'var(--space-fluid-xl)',
      },
      padding: {
        'fluid-xs': 'var(--space-fluid-xs)',
        'fluid-sm': 'var(--space-fluid-sm)',
        'fluid-md': 'var(--space-fluid-md)',
        'fluid-lg': 'var(--space-fluid-lg)',
        'fluid-xl': 'var(--space-fluid-xl)',
      },
    },
    fontFamily: {
      sans: ["Inter", "sans-serif"]
    }
  },
  plugins: []
};