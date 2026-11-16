/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        xlayer: {
          dark: '#0B0E14',
          card: '#121824',
          border: '#1F293D',
          accent: '#0052FF',
          green: '#10B981',
          gold: '#F59E0B',
          purple: '#8B5CF6'
        }
      }
    },
  },
  plugins: [],
}
