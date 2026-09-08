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
        dm: {
          bg: '#0f1115',
          panel: '#181b20',
          panelAlt: '#14171c',
          card: '#1e2229',
          cardHover: '#252a33',
          border: '#2a2f3a',
          borderLight: '#353c4a',
          accent: '#5865f2',
          accentHover: '#4752c4',
          success: '#3ba55d',
          successHover: '#2d8048',
          danger: '#ed4245',
          dangerHover: '#c03537',
          warning: '#faa81a',
          magic: '#eb459e',
          text: '#f2f3f5',
          textMuted: '#949ba4',
          textSubtle: '#6d7580'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace']
      }
    },
  },
  plugins: [],
}
