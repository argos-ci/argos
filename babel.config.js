const nodeConfig = {
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

const webConfig = {
  presets: [
    '@babel/preset-react',
    [
      '@babel/preset-env',
      {
        modules: false,
        loose: true,
        useBuiltIns: 'entry',
        corejs: 3,
      },
    ],
  ],
  plugins: [['@babel/plugin-proposal-class-properties', { loose: true }]],
}

function isWebTarget(caller) {
  return Boolean(caller && caller.name === 'babel-loader')
}

module.exports = api => {
  if (api.caller(isWebTarget)) {
    return webConfig
  }
  return nodeConfig
}
