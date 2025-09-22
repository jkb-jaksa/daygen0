// tailwind.config.js
const withOpacityValue = (variable) => {
  return ({ opacityValue } = {}) => {
    if (opacityValue !== undefined) {
      return `rgb(var(${variable}) / ${opacityValue})`;
    }
    return `rgb(var(${variable}))`;
  };
};

const daygenPalette = {
  text: withOpacityValue('--d-text-rgb'),
  white: withOpacityValue('--d-white-rgb'),
  light: withOpacityValue('--d-light-rgb'),
  mid: withOpacityValue('--d-mid-rgb'),
  dark: withOpacityValue('--d-dark-rgb'),
  black: withOpacityValue('--d-black-rgb'),
  orange: withOpacityValue('--d-orange-1-rgb'),
  'orange-1': withOpacityValue('--d-orange-1-rgb'),
};

module.exports = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Daygen palette
        d: daygenPalette,
        // Brand color
        brand: '#FF8C00',
        'brand-cyan': 'var(--brand-cyan)',
        'brand-red': 'var(--brand-red)',
        // Alias palette for testing (maps to d- tokens)
        b: { ...daygenPalette },
        // Back-compat aliases (optional)
        text: { DEFAULT: daygenPalette.text },
        border: {
          white: daygenPalette.white,
          light: daygenPalette.light,
          mid: daygenPalette.mid,
          dark: daygenPalette.dark,
          black: daygenPalette.black,
        }
      },
      borderColor: {
        DEFAULT: 'rgb(var(--d-dark-rgb))'
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
        DEFAULT: '200ms',
      },
      backdropBlur: {
        'xs': '2px',
        'sm': '4px',
        'DEFAULT': '8px',
        'md': '12px',
        'lg': '16px',
        'xl': '24px',
        '2xl': '40px',
        '3xl': '64px',
      },
    },
  },
  plugins: [],
};
