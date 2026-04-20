import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        paper: 'var(--color-paper)',
        'paper-2': 'var(--color-paper-2)',
        'paper-3': 'var(--color-paper-3)',
        sidebar: 'var(--color-sidebar)',
        ink: 'var(--color-ink)',
        'ink-2': 'var(--color-ink-2)',
        'ink-3': 'var(--color-ink-3)',
        coral: 'var(--color-coral)',
        'coral-ink': 'var(--color-coral-ink)',
        leaf: 'var(--color-leaf)',
        amber: 'var(--color-amber)',
        rose: 'var(--color-rose)',
        slate: 'var(--color-slate)',
        line: 'var(--color-line)',
        'line-2': 'var(--color-line-2)',
      },
      fontFamily: {
        display: ['var(--font-display)', 'Georgia', 'serif'],
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        xs: '4px',
        sm: '6px',
        md: '10px',
        lg: '14px',
        xl: '20px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(31, 30, 28, 0.05), 0 2px 8px rgba(31, 30, 28, 0.06)',
        raised: '0 1px 2px rgba(31, 30, 28, 0.06), 0 6px 16px rgba(31, 30, 28, 0.10)',
        pop: '0 12px 36px rgba(31, 30, 28, 0.16)',
      },
      transitionTimingFunction: {
        claude: 'cubic-bezier(.22,.61,.36,1)',
      },
      transitionDuration: {
        fast: '120ms',
        DEFAULT: '200ms',
        slow: '280ms',
      },
    },
  },
};

export default config;
