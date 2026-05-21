/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: '#6C47FF',
        secondary: '#FF6B35',
        background: '#0F0F14',
        surface: '#1A1A24',
        'text-primary': '#FFFFFF',
        'text-secondary': '#9B9BAE',
        success: '#22C55E',
        warning: '#F59E0B',
        error: '#EF4444',
        border: '#2A2A3A',
      },
    },
  },
  plugins: [],
};
