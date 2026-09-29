/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
      colors: {
        canvas: '#F8F6F2',
        ink: { DEFAULT: '#1C1917', soft: '#44403C', muted: '#78716C', faint: '#A8A29E' },
        line: { DEFAULT: '#ECE8E1', strong: '#E0DAD0' },
        brand: { DEFAULT: '#F59E0B', dark: '#D97706', ink: '#B45309', soft: '#FEF3E2', softer: '#FFF8EE' },
        navy: '#1E2A4A',
      },
      boxShadow: {
        card: '0 1px 2px rgba(28,25,23,0.04)',
        lift: '0 10px 30px -12px rgba(28,25,23,0.18)',
      },
      borderRadius: { xl2: '14px' },
    },
  },
  plugins: [],
};
