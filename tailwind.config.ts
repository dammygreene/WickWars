import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ww: {
          bg: '#08090C',
          elevated: '#0D0F13',
          surface: '#11141A',
          surface2: '#171A21',
          border: '#20242B',
          borderStrong: '#2A3038',
          text: '#F5F7FA',
          secondary: '#A5ACB7',
          muted: '#707783',
          disabled: '#474D56',
          win: '#35E58B',
          loss: '#FF4F5E',
        },
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: { sm: '8px', md: '12px', lg: '16px', xl: '20px' },
    },
  },
  plugins: [],
};

export default config;
