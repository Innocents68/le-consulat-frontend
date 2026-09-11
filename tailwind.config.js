/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bordeaux: {
          50: '#fbecee',
          100: '#f3ced3',
          200: '#e5a3ac',
          300: '#d4737f',
          400: '#c04b5a',
          500: '#a3313f',
          600: '#8a2531',
          700: '#7A1F2B', // primary
          800: '#611722',
          900: '#4a1119',
          950: '#2e0a10',
        },
        cream: {
          DEFAULT: '#FAF6F0',
          50: '#FFFFFF',
          100: '#FAF6F0',
          200: '#F3ECE1',
          300: '#EAE0D0',
        },
        gold: {
          DEFAULT: '#C9A24B',
          light: '#E4CD8E',
          dark: '#A9822F',
        },
        ink: {
          DEFAULT: '#2B2320',
          light: '#5A4E48',
        },
        night: {
          900: '#1B1512',
          800: '#241C18',
          700: '#2E241F',
          600: '#3A2E27',
        },
        success: '#2E9E4F',
        warning: '#E08A2C',
        danger: '#C0392B',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Playfair Display"', 'ui-serif', 'serif'],
      },
      boxShadow: {
        card: '0 1px 3px rgba(60, 30, 20, 0.08), 0 1px 2px rgba(60,30,20,0.06)',
        popover: '0 10px 30px rgba(60,30,20,0.18)',
      },
      borderRadius: {
        xl: '0.85rem',
        '2xl': '1.1rem',
      },
    },
  },
  plugins: [],
};
