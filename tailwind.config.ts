import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Modern Swiss Minimalist Palette
        obsidian: '#171717',
        white: '#FFFFFF',
        studio: '#F4F4F2',
        lightgrey: '#EAEAEA',
        graphite: '#777777',
        mutedtext: '#999999',
        bordergrey: '#E8E8E8',

        // Functional Status Colors
        status: {
          blue: '#2563EB',
          amber: '#D69E36',
          green: '#269568',
          red: '#D64B4B',
        },

        // Semantic bindings
        background: '#F4F4F2',
        foreground: '#171717',
        card: {
          DEFAULT: '#FFFFFF',
          foreground: '#171717',
        },
        popover: {
          DEFAULT: '#FFFFFF',
          foreground: '#171717',
        },
        primary: {
          DEFAULT: '#171717', // Obsidian primary
          hover: '#262626',
          foreground: '#FFFFFF',
        },
        secondary: {
          DEFAULT: '#FFFFFF',
          hover: '#F4F4F2',
          foreground: '#171717',
          border: '#E8E8E8',
        },
        muted: {
          DEFAULT: '#F4F4F2',
          foreground: '#777777',
        },
        border: '#E8E8E8',
        input: '#FFFFFF',
        ring: '#171717',
      },
      borderRadius: {
        lg: '0.625rem', // 10px
        md: '0.5rem',   // 8px
        sm: '0.375rem', // 6px
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['Geist Mono', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 3px 0 rgba(0, 0, 0, 0.04), 0 1px 2px 0 rgba(0, 0, 0, 0.02)',
        dropdown: '0 4px 12px 0 rgba(0, 0, 0, 0.08)',
        modal: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
      },
    },
  },
  plugins: [],
};

export default config;
