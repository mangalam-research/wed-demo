module.exports = {
  extends: "lddubeau-base",
  parserOptions: {
    sourceType: "module"
  },
  env: {
    node: true,
  },
  rules: {
    "import/no-extraneous-dependencies": "off",
    "indent-legacy" : ["error", 2, {
      "ArrayExpression": "first"
    }]
  }
};
