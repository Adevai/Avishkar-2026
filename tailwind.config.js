const colors = require('tailwindcss/colors');

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Instrument Sans"', 'Inter', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        ink: {
          50: '#f8fafc', 100: '#f1f5f9', 200: '#e2e8f0', 300: '#cbd5e1',
          400: '#94a3b8', 500: '#64748b', 600: '#475569', 700: '#334155',
          800: '#1e293b', 900: '#0f172a', 950: '#020617',
        },
        ivory: { DEFAULT: '#ffffff', deep: '#f8fafc' },
        gold: {
          50: '#eff6ff', 100: '#dbeafe', 200: '#bfdbfe', 300: '#93c5fd',
          400: '#60a5fa', 500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8',
          506: '#3b82f6', // alias
        },
        brand: {
          50: '#f0f7ff', 100: '#e0effe', 200: '#bae0fd', 300: '#7cc7fb',
          400: '#38a8f8', 500: '#0e8ce9', 600: '#026fc7', 700: '#0358a1',
          800: '#074b85', 900: '#0c3f6e', 950: '#082849',
        },
      },
      boxShadow: {
        'glow-sm': '0 0 24px -6px rgba(37,99,235,0.35)',
        'glow': '0 0 48px -12px rgba(37,99,235,0.45)',
        'card': '0 8px 30px rgba(0,0,0,0.04)',
        'card-hover': '0 16px 40px rgba(0,0,0,0.08)',
        'inset-line': 'inset 0 -1px 0 0 rgba(255,255,255,0.06)',
        'brutal': '6px 6px 0px 0px rgba(0,0,0,1)',
        'brutal-sm': '3px 3px 0px 0px rgba(0,0,0,1)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(14px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        'marquee': {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'pulse-dot': {
          '0%,100%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(1.6)', opacity: '0.5' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.55s cubic-bezier(0.16,1,0.3,1) both',
        'fade-in': 'animate-fade-in',
        'marquee': 'marquee 38s linear infinite',
        'shimmer': 'shimmer 2.6s linear infinite',
        'pulse-dot': 'pulse-dot 1.8s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
