// tailwind.config.js
module.exports = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Daygen palette
        d: {
          text: 'var(--d-text)',
          white: 'var(--d-white)',
          light1: 'var(--d-light-1)',
          mid: 'var(--d-mid)',
          dark: 'var(--d-dark)',
          black: 'var(--d-black)',
          orange: 'var(--d-orange-1)'
        },
        // Back-compat aliases (optional)
        text: { DEFAULT: 'var(--d-text)' },
        border: {
          white: 'var(--d-white)',
          light: 'var(--d-light-1)',
          mid: 'var(--d-mid)',
          dark: 'var(--d-dark)',
          black: 'var(--d-black)'
        }
      },
      borderColor: {
        DEFAULT: 'var(--d-dark)'
      },
      fontFamily: {
        cabin: ['"Cabin"', "sans-serif"], // Quotes due to space in name, 'sans-serif' as fallback
        raleway: ['"Raleway"', "sans-serif"], // Quotes due to space in name, 'sans-serif' as fallback
      },
    },
  },
  plugins: [],
};
