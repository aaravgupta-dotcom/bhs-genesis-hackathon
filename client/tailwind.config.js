/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        fuchsia: {
          DEFAULT: '#D8125B',
          hover: '#b80e4c',
          text: '#A80B44',
          light: 'rgba(216, 18, 91, 0.08)',
        },
        darkGrey: {
          DEFAULT: '#2C2E39',
          elevated: '#22242D',
          terminal: '#17181F',
        },
      },
    },
  },
  plugins: [],
}
