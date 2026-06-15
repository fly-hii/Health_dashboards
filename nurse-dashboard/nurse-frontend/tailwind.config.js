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
          DEFAULT: '#0EA5A4',
          dark: '#0F766E',
        },
        border: '#E5E7EB',
        text: {
          primary: '#0F172A',
          secondary: '#64748B',
        },
        success: '#10B981',
        warning: '#F97316',
        danger: '#EF4444',
      },
      borderRadius: {
        lg: '16px',
        xl: '20px',
      }
    },
  },
  plugins: [],
}
