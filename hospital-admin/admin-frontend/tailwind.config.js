/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0F9D8A',
          light: '#14b8a6',
          dark: '#0d8575',
          hover: '#0c8776',
          bg: '#e6f5f3'
        },
        sidebar: {
          bg: '#0B1F3A',
          hover: '#152b47',
          active: '#0F9D8A'
        },
        slateBg: '#F8FAFC',
        cardBorder: '#E2E8F0'
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      borderRadius: {
        'card': '16px',
      },
      spacing: {
        'header': '72px',
        'sidebar': '260px',
        'sidebar-min': '72px',
      }
    },
  },
  plugins: [],
}
