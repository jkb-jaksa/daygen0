const orderPlugin = require('stylelint-order').default || require('stylelint-order');

module.exports = {
  plugins: [orderPlugin],
  rules: {
    'order/properties-alphabetical-order': true,
    'at-rule-no-unknown': [
      true,
      {
        ignoreAtRules: [
          'tailwind',
          'apply',
          'variants',
          'responsive',
          'screen',
          'layer',
        ],
      },
    ],
  },
};
