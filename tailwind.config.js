/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Neon accent colors for dark theme
        'neon-cyan': '#00f5ff',
        'neon-purple': '#a855f7',
        'neon-pink': '#ec4899',
        'neon-orange': '#f97316',
        'neon-green': '#10b981',
        // Dark backgrounds
        'dark': {
          900: '#0a0a0f',  // Darkest - main background
          800: '#12121a',  // Dark - cards/panels
          700: '#1a1a25',  // Medium dark
          600: '#252530',  // Lighter dark
        },
        // Accent colors
        'accent': {
          primary: '#00f5ff',
          secondary: '#a855f7',
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
        'slide-down': 'slide-down 0.3s ease-out',
        'fade-in': 'fade-in 0.2s ease-out',
        'radar': 'radar 2s linear infinite',
        'ping': 'ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite',
        'pulse-subtle': 'pulse-subtle 2s ease-in-out infinite',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(0, 245, 255, 0.3)' },
          '50%': { boxShadow: '0 0 40px rgba(0, 245, 255, 0.6)' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'slide-down': {
          '0%': { transform: 'translateY(-20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'radar': {
          '0%': { transform: 'scale(1)', opacity: '1' },
          '100%': { transform: 'scale(3)', opacity: '0' },
        },
        'pulse-subtle': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.8' },
        }
      },
      boxShadow: {
        'glow': '0 0 20px rgba(0, 245, 255, 0.3)',
        'glow-lg': '0 0 40px rgba(0, 245, 255, 0.4)',
        'neon': '0 0 10px currentColor, 0 0 20px currentColor',
      }
    },
  },
  plugins: [],
}

