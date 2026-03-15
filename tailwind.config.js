/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          900: '#050505',
          800: '#111111',
          700: '#1a1a1a',
          600: '#2a2a2a',
        },
        neon: {
          cyan: '#00f3ff',
          green: '#39ff14',
          pink: '#ff00ff',
          purple: '#bc13fe',
          orange: '#ff5e00',
        }
      },
      boxShadow: {
        'neon-cyan': '0 0 10px #00f3ff, 0 0 20px #00f3ff',
        'neon-green': '0 0 10px #39ff14, 0 0 20px #39ff14',
        'neon-pink': '0 0 10px #ff00ff, 0 0 20px #ff00ff',
        'neon-purple': '0 0 10px #bc13fe, 0 0 20px #bc13fe',
        'neon-orange': '0 0 10px #ff5e00, 0 0 20px #ff5e00',
      }
    },
  },
  plugins: [],
}
