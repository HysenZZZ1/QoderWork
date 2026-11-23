/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Restrained, professional blue — the single accent color.
        brand: {
          50: '#eef4ff',
          100: '#dbe6fe',
          200: '#bfd3fe',
          300: '#93b4fd',
          400: '#608ffa',
          500: '#3b6fd6',
          600: '#2f5cc0',
          700: '#27499c',
          800: '#25407f',
          900: '#233869',
        },
        // Neutral surfaces & text (slate-based, cool gray).
        ink: {
          50: '#f7f8fa',
          100: '#eef0f4',
          200: '#e2e5ec',
          300: '#cbd2dd',
          400: '#9aa4b5',
          500: '#6b7688',
          600: '#525c6b',
          700: '#3f4753',
          800: '#2b313b',
          900: '#1c2129',
        },
        canvas: '#f5f6f8',
      },
      fontFamily: {
        sans: [
          'Inter',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'PingFang SC',
          'Hiragino Sans GB',
          'Microsoft YaHei',
          'sans-serif',
        ],
        mono: [
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'Consolas',
          'Liberation Mono',
          'monospace',
        ],
      },
      boxShadow: {
        card: '0 1px 2px rgba(16, 24, 40, 0.04), 0 1px 3px rgba(16, 24, 40, 0.06)',
        panel: '0 4px 16px rgba(16, 24, 40, 0.06)',
        pop: '0 8px 30px rgba(16, 24, 40, 0.12)',
      },
      borderRadius: {
        DEFAULT: '6px',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.2s ease-out',
        'fade-up': 'fade-up 0.25s ease-out',
      },
    },
  },
  plugins: [],
}