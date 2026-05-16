import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#090909',
        'surface-1': '#141414',
        'surface-2': '#1c1c1c',
        hairline: '#262626',
        'hairline-soft': '#1a1a1a',
        ink: '#ffffff',
        'ink-muted': '#999999',
        'accent-blue': '#0099ff',
        'grad-violet': '#6a4cf5',
        'grad-magenta': '#d44df0',
        'grad-orange': '#ff7a3d',
        'grad-coral': '#ff5577',
        success: '#22c55e',
      },
      borderRadius: {
        xs: '4px',
        sm: '6px',
        md: '10px',
        lg: '15px',
        xl: '20px',
        xxl: '30px',
        pill: '100px',
      },
      fontFamily: {
        display: ['"Inter Variable"', 'Inter', 'system-ui', 'sans-serif'],
        body: ['"Inter Variable"', 'Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config

