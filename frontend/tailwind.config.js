/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)', 'Outfit', 'sans-serif'],
      },
      colors: {
        primary: {
          light: '#a89cf8',
          DEFAULT: '#7c6fea',
          dark: '#5b4fc7',
        },
        secondary: {
          light: '#9be8ff',
          DEFAULT: '#4cc9f0',
          dark: '#2da8d0',
        },
        accent: {
          pink: '#ff7eb3',
          gold: '#ffd166',
          mint: '#6fdfaf',
        },
        cream: '#fefbf4',
        lavender: '#f0ecff',
      },
      borderRadius: {
        '4xl': '1.75rem',
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};
