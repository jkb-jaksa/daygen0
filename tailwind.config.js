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
          orange: 'var(--d-orange-1)',
          'orange-1': 'var(--d-orange-1)'
        },
        // Brand color
        brand: '#faaa16',
        'brand-cyan': 'var(--brand-cyan)',
        'brand-red': 'var(--brand-red)',
        // Alias palette for testing (maps to d- tokens)
        b: {
          text: 'var(--d-text)',
          white: 'var(--d-white)',
          light: 'var(--d-light)',
          mid: 'var(--d-mid)',
          dark: 'var(--d-dark)',
          black: 'var(--d-black)',
          orange: 'var(--d-orange-1)',
          'orange-1': 'var(--d-orange-1)'
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
      transitionDuration: {
        '100': '100ms',
        '150': '150ms',
        '200': '200ms',
        '300': '300ms',
        '500': '500ms',
        '700': '700ms',
        '1000': '1000ms',
      },
    },
  },
  plugins: [],
};
