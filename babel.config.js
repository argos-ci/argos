module.exports = {
  presets: [
    [
      "@babel/preset-env",
      {
        loose: true,
        useBuiltIns: "entry",
        corejs: 3,
        targets: {
          node: "current",
        },
      },
    ],
  ],
};
