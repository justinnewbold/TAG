/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Light theme accent colors
        'neon-cyan': '#0ea5e9',      // Sky blue (mapped from cyan)
        'neon-purple': '#8b5cf6',    // Violet
        'neon-pink': '#ec4899',      // Pink
        'neon-orange': '#f97316',    // Orange
        'neon-green': '#10b981',     // Emerald
        // Light backgrounds (mapped from dark)
        'dark': {
          900: '#f8fafc',  // Light gray (was darkest)
          800: '#ffffff',  // White (was dark)
          700: '#f1f5f9',  // Lighter gray
          600: '#e2e8f0',  // Even lighter
        },
        // New light theme specific colors
        'light': {
          50: '#ffffff',
          100: '#f8fafc',
          200: '#f1f5f9',
          300: '#e2e8f0',
          400: '#cbd5e1',
          500: '#94a3b8',
        },
        'accent': {
          primary: '#0ea5e9',
          secondary: '#8b5cf6',
          tertiary: '#f97316',
          success: '#10b981',
          danger: '#ef4444',
        }
      },
      fontFamily: {
        'display': ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'slide-up': 'slide-up 0.3s ease-out',
        'radar': 'radar 2s linear infinite',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(14, 165, 233, 0.2)' },
          '50%': { boxShadow: '0 0 30px rgba(14, 165, 233, 0.4)' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'radar': {
          '0%': { transform: 'scale(1)', opacity: '1' },
          '100%': { transform: 'scale(3)', opacity: '0' },
        }
      },
      boxShadow: {
        'soft': '0 2px 15px rgba(0, 0, 0, 0.05)',
        'medium': '0 4px 20px rgba(0, 0, 0, 0.08)',
        'glow': '0 0 20px rgba(14, 165, 233, 0.2)',
      }
    },
  },
  plugins: [],
}
