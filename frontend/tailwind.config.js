/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        inter: ['Inter', 'sans-serif'],
      },
      colors: {
        mpi: {
          DEFAULT: '#2563EB',
          light: '#DBEAFE',
          dark: '#1D4ED8',
          text: '#1E40AF',
        },
        staff: {
          DEFAULT: '#16A34A',
          light: '#DCFCE7',
          dark: '#15803D',
          text: '#166534',
        },
        ejp: {
          DEFAULT: '#7C3AED',
          light: '#EDE9FE',
          dark: '#6D28D9',
          text: '#5B21B6',
        },
        surface: '#F8FAFC',
        card: '#FFFFFF',
        border: '#E5E7EB',
        'text-primary': '#111827',
        'text-muted': '#6B7280',
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        'card-md': '0 4px 6px -1px rgba(0,0,0,0.07), 0 2px 4px -1px rgba(0,0,0,0.04)',
        'card-lg': '0 10px 15px -3px rgba(0,0,0,0.08), 0 4px 6px -2px rgba(0,0,0,0.04)',
      },
      borderRadius: {
        DEFAULT: '12px',
        sm: '6px',
        xs: '4px',
      },
      animation: {
        'spin-slow': 'spin 1.5s linear infinite',
        'pulse-soft': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
