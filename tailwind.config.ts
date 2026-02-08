import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.6s ease-out forwards',
        'fade-up': 'fadeUp 0.6s ease-out forwards',
        'slide-up': 'slideUp 0.4s ease-out forwards',
        'scale-in': 'scaleIn 0.3s ease-out forwards',
        'pulse-soft': 'pulseSoft 3s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '0.4' },
          '50%': { opacity: '0.8' },
        },
      },
    },
  },
  safelist: [
    'bg-blue-500/10', 'bg-cyan-500/10', 'bg-emerald-500/10', 'bg-purple-500/10', 'bg-amber-500/10', 'bg-rose-500/10',
    'bg-pink-500/10', 'bg-indigo-500/10', 'bg-violet-500/10',
    'border-blue-500/10', 'border-cyan-500/10', 'border-emerald-500/10', 'border-purple-500/10', 'border-amber-500/10', 'border-rose-500/10',
    'text-blue-400', 'text-cyan-400', 'text-emerald-400', 'text-purple-400', 'text-amber-400', 'text-rose-400',
    'text-pink-400', 'text-indigo-400', 'text-violet-400',
  ],
  plugins: [],
};

export default config;
