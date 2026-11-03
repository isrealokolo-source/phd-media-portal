import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#0B0D11',
        foreground: '#F3F4F6',
        card: {
          DEFAULT: '#12151B',
          foreground: '#F3F4F6',
        },
        popover: {
          DEFAULT: '#141820',
          foreground: '#F3F4F6',
        },
        primary: {
          DEFAULT: '#6366F1', // Elegant indigo/violet
          hover: '#4F46E5',
          foreground: '#FFFFFF',
        },
        secondary: {
          DEFAULT: '#1E232E',
          hover: '#29303E',
          foreground: '#E5E7EB',
        },
        muted: {
          DEFAULT: '#181C25',
          foreground: '#9CA3AF',
        },
        accent: {
          DEFAULT: '#222836',
          foreground: '#F9FAFB',
        },
        destructive: {
          DEFAULT: '#EF4444',
          foreground: '#FFFFFF',
        },
        success: {
          DEFAULT: '#10B981',
          foreground: '#FFFFFF',
        },
        warning: {
          DEFAULT: '#F59E0B',
          foreground: '#FFFFFF',
        },
        border: '#1F2430',
        input: '#1A1F2B',
        ring: '#6366F1',
      },
      borderRadius: {
        lg: '0.625rem',
        md: '0.5rem',
        sm: '0.375rem',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;

