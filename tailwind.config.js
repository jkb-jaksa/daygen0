// tailwind.config.js
const withOpacityValue = (variable) => {
  return ({ opacityValue } = {}) => {
    if (opacityValue !== undefined) {
      return `rgb(var(${variable}) / ${opacityValue})`;
    }
    return `rgb(var(${variable}))`;
  };
};

const nightPalette = {
  text: withOpacityValue('--n-text-rgb'),
  white: withOpacityValue('--n-white-rgb'),
  light: withOpacityValue('--n-light-rgb'),
  mid: withOpacityValue('--n-mid-rgb'),
  dark: withOpacityValue('--n-dark-rgb'),
  black: withOpacityValue('--n-black-rgb'),
  orange: withOpacityValue('--n-orange-1-rgb'),
  'orange-1': withOpacityValue('--n-orange-1-rgb'),
};

const dayPalette = {
  text: withOpacityValue('--d-text-rgb'),
  white: withOpacityValue('--d-white-rgb'),
  light: withOpacityValue('--d-light-rgb'),
  mid: withOpacityValue('--d-mid-rgb'),
  dark: withOpacityValue('--d-dark-rgb'),
  black: withOpacityValue('--d-black-rgb'),
  orange: withOpacityValue('--d-orange-1-rgb'),
  'orange-1': withOpacityValue('--d-orange-1-rgb'),
};

const themePalette = {
  text: withOpacityValue('--theme-text-rgb'),
  white: withOpacityValue('--theme-white-rgb'),
  light: withOpacityValue('--theme-light-rgb'),
  mid: withOpacityValue('--theme-mid-rgb'),
  dark: withOpacityValue('--theme-dark-rgb'),
  black: withOpacityValue('--theme-black-rgb'),
  orange: withOpacityValue('--theme-orange-1-rgb'),
  'orange-1': withOpacityValue('--theme-orange-1-rgb'),
};

module.exports = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      gridTemplateColumns: {
        '7': 'repeat(7, minmax(0, 1fr))',
        '8': 'repeat(8, minmax(0, 1fr))',
      },
      colors: {
        // Theme palettes
        n: nightPalette,
        d: dayPalette,
        theme: themePalette,
        // Brand color
        brand: '#FF8C00',
        'brand-cyan': 'var(--brand-cyan)',
        'brand-red': 'var(--brand-red)',
        // Alias palette for testing (maps to d- tokens)
        b: { ...themePalette },
        // Back-compat aliases (optional)
        text: { DEFAULT: themePalette.text },
        border: {
          white: themePalette.white,
          light: themePalette.light,
          mid: themePalette.mid,
          dark: themePalette.dark,
          black: themePalette.black,
        }
      },
      borderColor: {
        DEFAULT: 'rgb(var(--theme-dark-rgb))'
      },
      fontFamily: {
        sans: ['"Raleway"', "sans-serif"],
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
