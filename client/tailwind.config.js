/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'flux-primary': '#6366f1',
        'flux-secondary': '#8b5cf6',
        'flux-dark': '#1f2937',
        'flux-darker': '#111827',
        'flux-light': '#f9fafb',
        'flux-gray': '#6b7280',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
  darkMode: 'class',
}