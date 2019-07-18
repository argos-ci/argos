const resolver = ['babel-plugin-module-resolver', { root: ['./src'] }]

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
  plugins: [resolver, '@babel/plugin-proposal-class-properties'],
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
  plugins: [resolver, '@babel/plugin-proposal-class-properties'],
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
