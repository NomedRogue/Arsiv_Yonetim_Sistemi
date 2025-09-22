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
        '3xl': '1920px', // Ultra-wide ekranlar için
      },
      colors: {
        "archive-primary": "#0078D4",
        "archive-secondary": "#E5F3FF",
        "archive-light-bg": "#F5F5F5",
        "archive-dark-bg": "#1e293b",
        "archive-dark-panel": "#334155",
        "archive-dark-text": "#f1f5f9",
        "archive-light-text": "#000000",
        "status-green": "#28A745",
        "status-yellow": "#FFC107",
        "status-red": "#DC3545",
        "status-orange": "#FD7E14",
        "status-blue": "#007BFF",
        // Chart colors for different themes
        "chart-light": {
          "primary": "#0078D4",
          "secondary": "#E5F3FF",
          "accent": "#8884d8",
          "success": "#82ca9d",
          "warning": "#FD7E14"
        },
        "chart-dark": {
          "primary": "#3B82F6",
          "secondary": "#1F2937",
          "accent": "#3B82F6",
          "success": "#10B981",
          "warning": "#F59E0B"
        }
      }
    },
    fontFamily: {
      sans: ["Inter", "sans-serif"]
    }
  },
  plugins: []
};