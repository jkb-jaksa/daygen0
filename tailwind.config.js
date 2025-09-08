// tailwind.config.js
module.exports = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        cabin: ['"Cabin"', "sans-serif"], // Quotes due to space in name, 'sans-serif' as fallback
        raleway: ['"Raleway"', "sans-serif"], // Quotes due to space in name, 'sans-serif' as fallback
      },
    },
  },
  plugins: [],
};
