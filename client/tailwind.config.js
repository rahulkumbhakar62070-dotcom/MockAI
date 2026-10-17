/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Inter"', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['"Manrope"', '"Inter"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        // Editorial Warm Ivory & Forest Green Palette
        ivory: {
          DEFAULT: '#F8F6F0',
          subtle: '#F2EFE8',
        },
        forest: {
          DEFAULT: '#245C46',
          hover: '#1D4A38',
          light: '#2E7358',
          dark: '#16392B',
          surface: '#F0F5F2',
        },
        sage: {
          DEFAULT: '#DCE8DC',
          subtle: '#EEF4EE',
          dark: '#BDD2BD',
          border: 'rgba(36, 92, 70, 0.18)',
        },
        terra: {
          DEFAULT: '#E99564', // Accent muted orange
          muted: 'rgba(233, 149, 100, 0.15)',
          dark: '#C9713C',
        },
        charcoal: {
          DEFAULT: '#252923', // Main text
          heading: '#1A1D19',
          light: '#3C4239',
        },
        muted: {
          DEFAULT: '#777970', // Secondary text
          light: '#989A92',
        },
        beige: {
          DEFAULT: '#E8E4DA', // Borders
          subtle: '#F0ECE3',
        },
      },
      boxShadow: {
        'card': '0 2px 8px -2px rgba(37, 41, 35, 0.05)',
        'card-hover': '0 8px 24px -4px rgba(36, 92, 70, 0.08)',
        'elevated': '0 12px 32px -6px rgba(37, 41, 35, 0.08)',
      },
    },
  },
  plugins: [],
}
