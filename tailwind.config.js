/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        socal: {
          orange: '#E88B44',
          'orange-dark': '#D47731',
          'orange-light': '#FDF1E6',
          plum: '#692F64',
          'plum-dark': '#52234E',
          'plum-light': '#F6EDF5',
          ink: '#2B3A4A',
          sand: '#FAF7F2',
          'sand-border': '#EAE2D6',
        },
      },
    },
  },
  plugins: [],
}