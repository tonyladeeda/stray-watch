/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        socal: {
          orange: '#F25C19',
          'orange-dark': '#D4480A',
          'orange-light': '#FFF2EB',
          plum: '#581C69',
          'plum-dark': '#3E124B',
          'plum-light': '#F6EEF9',
          urgent: '#DC2626',
          'urgent-dark': '#B91C1C',
          'urgent-light': '#FEF2F2',
          ink: '#111827',
          sand: '#F6F5F2',
          'sand-border': '#E6E2DC',
        },
      },
    },
  },
  plugins: [],
}