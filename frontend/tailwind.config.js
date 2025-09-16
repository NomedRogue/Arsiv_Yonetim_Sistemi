/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}"
  ],
  darkMode: "class",
  theme: {
    extend: {
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
        "status-blue": "#007BFF"
      }
    },
    fontFamily: {
      sans: ["Inter", "sans-serif"]
    }
  },
  plugins: []
};