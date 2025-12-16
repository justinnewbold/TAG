/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'neon-cyan': '#00f5ff',
        'neon-purple': '#a855f7',
        'neon-pink': '#ec4899',
        'neon-orange': '#f97316',
        'neon-green': '#22c55e',
        'dark': {
          900: '#0a0a0f',
          800: '#12121a',
          700: '#1a1a25',
          600: '#252530',
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
          '0%, 100%': { boxShadow: '0 0 20px rgba(0, 245, 255, 0.3)' },
          '50%': { boxShadow: '0 0 40px rgba(0, 245, 255, 0.6)' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'radar': {
          '0%': { transform: 'scale(1)', opacity: '1' },
          '100%': { transform: 'scale(3)', opacity: '0' },
        }
      }
    },
  },
  plugins: [],
}
