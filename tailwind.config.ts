import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/features/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        cta: {
          DEFAULT: 'hsl(var(--cta))',
          hover: 'hsl(var(--cta-hover))',
          fg: 'hsl(var(--cta-fg))',
        },
        organic: {
          terracotta: {
            DEFAULT: '#D95D39',
            hover: '#B94E2F',
            active: '#8F3B24',
            light: '#F6C1B4',
            lightest: '#FDF0EC',
          },
          orange: '#D95D39',
          golden: '#F0A202',
          yellow: '#FFE500',
          black: '#000000',
          white: '#FFFFFF',
        },
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar))',
          foreground: 'hsl(var(--sidebar-foreground))',
          border: 'hsl(var(--sidebar-border))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          muted: 'hsl(var(--sidebar-muted))',
          'muted-foreground': 'hsl(var(--sidebar-muted-foreground))',
        },
        game: {
          orange: 'var(--orange)',
          'orange-glow': 'var(--orange-glow)',
          'orange-dim': 'var(--orange-dim)',
          yellow: 'var(--yellow)',
          green: 'var(--green)',
          red: 'var(--red)',
          purple: 'var(--purple)',
          cyan: 'var(--cyan)',
          surface: 'var(--surface)',
          surface2: 'var(--surface2)',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'DM Sans', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'Fraunces', 'Georgia', 'serif'],
        mono: ['var(--font-mono)', 'JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'auth-fade-in': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'auth-shake': {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%, 60%': { transform: 'translateX(-4px)' },
          '40%, 80%': { transform: 'translateX(4px)' },
        },
        'streak-pop': {
          '0%': { transform: 'scale(1)', filter: 'drop-shadow(0 0 0 rgba(251,146,60,0))' },
          '30%': { transform: 'scale(1.35) rotate(-6deg)', filter: 'drop-shadow(0 0 12px rgba(251,146,60,0.9))' },
          '60%': { transform: 'scale(0.95) rotate(4deg)', filter: 'drop-shadow(0 0 16px rgba(251,146,60,0.6))' },
          '100%': { transform: 'scale(1) rotate(0)', filter: 'drop-shadow(0 0 0 rgba(251,146,60,0))' },
        },
        'streak-count': {
          '0%': { transform: 'translateY(8px) scale(0.8)', opacity: '0' },
          '60%': { transform: 'translateY(-2px) scale(1.15)', opacity: '1' },
          '100%': { transform: 'translateY(0) scale(1)', opacity: '1' },
        },
        'streak-flicker': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.82' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.5s ease-out forwards',
        'auth-fade-in': 'auth-fade-in 0.4s ease-out both',
        'auth-shake': 'auth-shake 0.4s ease-in-out',
        'streak-pop': 'streak-pop 0.7s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'streak-count': 'streak-count 0.5s ease-out',
        'streak-flicker': 'streak-flicker 2.4s ease-in-out infinite',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
