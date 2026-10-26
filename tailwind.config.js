/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          navy: '#0A1428',
          'navy-light': '#142544',
          'navy-dark': '#050B16',
          electric: '#0066FF',
          'electric-hover': '#0052CC',
          'electric-light': '#38BDF8',
        },
        fleet: {
          active: '#10B981',    // green
          idle: '#F59E0B',      // amber
          offline: '#64748B',   // gray
          breach: '#EF4444',    // red
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
}
