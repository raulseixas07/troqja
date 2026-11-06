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
        troqja: {
          primary: '#FF6B00',
          'primary-hover': '#E65A00',
          orange: '#FF6B00',
          'orange-hover': '#E65A00',
          secondary: '#00C853',
          'secondary-hover': '#00B248',
          success: '#00C853',
          'success-hover': '#00B248',
          dark: '#111827',
          gray: '#F3F4F6',
          'border-gray': '#E5E7EB',
          muted: '#6B7280',
          purple: '#6E0AD6',
          'purple-hover': '#5906B3',
        },
        olx: {
          orange: '#FF6B00',
          'orange-hover': '#E65A00',
          green: '#00C853',
          'green-hover': '#00B248',
          purple: '#6E0AD6',
          'purple-hover': '#5906B3',
          dark: '#111827',
          gray: '#F3F4F6',
          'border-gray': '#E5E7EB',
          muted: '#6B7280',
        },
      },
    },
  },
  plugins: [],
};

export default config;
