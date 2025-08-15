/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'nexus-black': '#0A0A0A',
        'nexus-darker': '#0D0D0D',
        'nexus-dark': '#111111',
        'nexus-gray': '#1A1A1A',
        'nexus-lighter': '#242424',
        'nexus-border': '#2A2A2A',
        'nexus-accent': '#00FF88',
        'nexus-accent-dim': '#00CC6A',
        'nexus-cyan': '#00E5FF',
        'nexus-gold': '#FFD700',
        'nexus-silver': '#C0C0C0',
        'nexus-glass': 'rgba(255, 255, 255, 0.02)',
        'nexus-glass-border': 'rgba(255, 255, 255, 0.08)',
      },
      backdropBlur: {
        'xs': '2px',
        '4xl': '72px',
      },
      backgroundImage: {
        'nexus-gradient': 'linear-gradient(135deg, #0A0A0A 0%, #1A1A1A 100%)',
        'nexus-mesh': 'radial-gradient(at 40% 20%, hsla(142, 100%, 50%, 0.1) 0px, transparent 50%), radial-gradient(at 80% 0%, hsla(189, 100%, 56%, 0.05) 0px, transparent 50%), radial-gradient(at 0% 50%, hsla(51, 100%, 50%, 0.03) 0px, transparent 50%)',
        'nexus-glow': 'radial-gradient(600px circle at var(--mouse-x) var(--mouse-y), rgba(0, 255, 136, 0.06), transparent 40%)',
      },
      animation: {
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'fade-in': 'fadeIn 0.5s ease-out',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        glow: {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.5 },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: 0 },
          '100%': { transform: 'translateY(0)', opacity: 1 },
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: 0 },
          '100%': { transform: 'translateY(0)', opacity: 1 },
        },
        fadeIn: {
          '0%': { opacity: 0 },
          '100%': { opacity: 1 },
        },
      },
      fontFamily: {
        'mono': ['SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', 'monospace'],
        'display': ['SF Pro Display', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}