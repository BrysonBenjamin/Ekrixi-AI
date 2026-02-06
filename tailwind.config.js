/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Plus Jakarta Sans', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
        serif: ['Lora', 'serif'],
      },
      colors: {
        nexus: {
          950: 'var(--bg-950)',
          900: 'var(--bg-900)',
          800: 'var(--bg-800)',
          700: 'var(--bg-700)',
          600: 'var(--bg-600)',
          500: 'var(--accent-500)',
          400: 'var(--accent-400)',
          300: 'var(--accent-300)',
          accent: 'var(--accent-color)',
          arcane: 'var(--arcane-color)',
          essence: 'var(--essence-color)',
          ruby: '#e11d48',
          text: 'var(--text-main)',
          muted: 'var(--text-muted)',
        },
      },
      animation: {
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
};
