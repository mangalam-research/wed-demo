module.exports = {
  extends: [
    "lddubeau-base"
  ],
  env: {
    node: true,
  },
  rules: {
    "no-continue": "off",
    "import/no-extraneous-dependencies": "off",
    "import/no-unresolved": "off",
    camelcase: ["off",
                "We turn this off for now. Eventually we'll turn it on " +
                "and make the change in one shot, API and all."],
    "no-mixed-operators": [
      "error",
      { "allowSamePrecedence": true },
    ],
  }
};
