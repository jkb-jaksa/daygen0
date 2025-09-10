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
          light: 'var(--d-light)',
          mid: 'var(--d-mid)',
          dark: 'var(--d-dark)',
          black: 'var(--d-black)',
          orange: 'var(--d-orange-1)'
        },
        // Alias palette for testing (maps to d- tokens)
        b: {
          text: 'var(--d-text)',
          white: 'var(--d-white)',
          light: 'var(--d-light)',
          mid: 'var(--d-mid)',
          dark: 'var(--d-dark)',
          black: 'var(--d-black)',
          orange: 'var(--d-orange-1)'
        },
        // Back-compat aliases (optional)
        text: { DEFAULT: 'var(--d-text)' },
        border: {
          white: 'var(--d-white)',
          light: 'var(--d-light)',
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
