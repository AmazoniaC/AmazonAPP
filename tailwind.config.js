/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Amazonia Concrete brand palette
        amazonia: {
          50:  '#f2f7f0',
          100: '#e0ecd9',
          200: '#c2d9b4',
          300: '#97be82',
          400: '#6ea050',
          500: '#527d36',
          600: '#3d6227',
          700: '#2d4a1e',  // dark forest — primary actions
          800: '#1e3315',  // deeper green
          900: '#12200d',  // darkest — sidebar bg
          950: '#0a1408',
        },
        earth: {
          400: '#a87050',
          500: '#8b5e3c',  // warm brown accent
          600: '#6f4a2a',
        },
        stone: {
          50:  '#f9f7f2',
          100: '#f0ece2',
          200: '#e0d9c8',
          300: '#c8c0a8',
          400: '#a89e86',
        },
        // keep primary alias pointing to amazonia-700
        primary: {
          50:  '#f2f7f0',
          100: '#e0ecd9',
          500: '#527d36',
          600: '#3d6227',
          700: '#2d4a1e',
          800: '#1e3315',
          900: '#12200d',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'soft':     '0 2px 8px -2px rgba(15, 23, 42, 0.06), 0 1px 3px -1px rgba(15, 23, 42, 0.04)',
        'soft-lg':  '0 8px 24px -8px rgba(15, 23, 42, 0.10), 0 4px 8px -4px rgba(15, 23, 42, 0.05)',
        'glow':     '0 0 0 1px rgba(45, 74, 30, 0.05), 0 4px 16px -4px rgba(45, 74, 30, 0.15)',
        'glow-amazonia': '0 0 24px -4px rgba(82, 125, 54, 0.35)',
        'inner-soft': 'inset 0 1px 2px rgba(15, 23, 42, 0.04)',
      },
      backdropBlur: {
        'xs': '2px',
      },
      animation: {
        'pulse-soft':  'pulseSoft 2s ease-in-out infinite',
        'gradient':    'gradient 8s ease infinite',
        'float':       'float 3s ease-in-out infinite',
      },
      keyframes: {
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%':       { opacity: '0.6' },
        },
        gradient: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%':       { backgroundPosition: '100% 50%' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':       { transform: 'translateY(-4px)' },
        },
      },
    },
  },
  plugins: [],
}
