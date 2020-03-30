module.exports = {
  presets: [
    '@babel/preset-react',
    [
      '@babel/preset-env',
      {
        loose: true,
        useBuiltIns: 'entry',
        corejs: 3,
        targets: {
          node: 'current',
        },
      },
    ],
  ],
  plugins: [['@babel/plugin-proposal-class-properties', { loose: true }]],
}
