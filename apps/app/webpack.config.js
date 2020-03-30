/* eslint-disable import/no-extraneous-dependencies */
require('@babel/register')({
  ignore: [],
  presets: [
    [
      '@babel/preset-env',
      {
        loose: true,
        targets: {
          node: 'current',
        },
      },
    ],
  ],
})

const webpack = require('webpack')
const AssetsPlugin = require('assets-webpack-plugin')
const { default: config } = require('@argos-ci/config')

const prod = process.env.NODE_ENV === 'production'
module.exports = {
  mode: prod ? 'production' : 'development',
  entry: './src/index.js',
  output: {
    filename: prod ? '[name]-bundle-[chunkhash:8].js' : '[name].js',
    publicPath: '/static/app/',
  },
  devtool: prod ? 'source-map' : false,
  module: {
    rules: [
      {
        test: /\.js$/,
        use: 'babel-loader',
        exclude: /node_modules\/(?!material-ui)/,
      },
      {
        test: /\.json$/,
        exclude: /node_modules/,
        use: 'json-loader',
      },
      {
        test: /\.woff$/,
        use: 'url-loader?limit=100000',
      },
      {
        test: /\.(jpe?g|png|gif|svg)$/,
        use: 'file-loader', // Hash name by default
      },
      {
        test: /\.svg$/,
        loader: 'image-webpack-loader',
        query: {
          svgo: {
            plugins: [
              {
                convertPathData: {
                  floatPrecision: 2,
                },
              },
            ],
          },
        },
      },
      {
        test: /\.html$/,
        loader: 'html-loader',
      },
      {
        test: /\.md$/,
        loader: 'raw-loader',
      },
    ],
  },
  plugins: [
    ...(prod
      ? [
          new AssetsPlugin({
            filename: 'dist/assets.json',
            prettyPrint: true,
          }),
        ]
      : []),
    new webpack.EnvironmentPlugin({
      PLATFORM: 'browser',
      SENTRY_RELEASE: process.env.COMMIT_REF || '',
      API_BASE_URL: 'http://api.dev.argos-ci.com:4001',
    }),
  ],
  devServer: {
    historyApiFallback: true,
    port: config.get('client.port'),
    disableHostCheck: true, // For security checks, no need here.
    // webpack-dev-middleware options.
    stats: {
      // Remove built modules information.
      modules: false,
      // Remove built modules information to chunk information.
      chunkModules: false,
      colors: true,
    },
    proxy: {
      '**': {
        target: {
          host: 'www.dev.argos-ci.com',
          protocol: 'http:',
          port: config.get('server.port'),
        },
        changeOrigin: true,
        secure: false,
      },
    },
  },
}
