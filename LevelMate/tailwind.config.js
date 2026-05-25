/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: '#6C47FF',
        'primary-light': '#EDE9FF',
        secondary: '#FF6B35',
        background: '#F8F9FC',
        surface: '#FFFFFF',
        'surface-secondary': '#F2F3F7',
        'text-primary': '#0D0D14',
        'text-secondary': '#6B7280',
        'text-tertiary': '#9CA3AF',
        border: '#E5E7EB',
        success: '#22C55E',
        'success-light': '#DCFCE7',
        warning: '#F59E0B',
        error: '#EF4444',
      },
    },
  },
  plugins: [],
};
