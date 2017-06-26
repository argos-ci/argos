import webpack from 'webpack'
import ForceCaseSensitivityPlugin from 'force-case-sensitivity-webpack-plugin'
import browserBaseConfig from './browserBaseConfig'
import config from '../../config'

export default {
  ...browserBaseConfig,
  entry: [
    // activate HMR for React.
    'react-hot-loader/patch',
    // bundle the client for webpack-dev-server
    // and connect to the provided endpoint.
    `webpack-dev-server/client?http://localhost:${config.get('client.port')}`,
    // bundle the client for hot reloading
    // only- means to only hot reload for successful updates.
    'webpack/hot/only-dev-server',
    ...browserBaseConfig.entry,
  ],
  output: {
    ...browserBaseConfig.output,
    filename: 'browser.js',
    // * filename */ comments to generated require()s in the output.
    pathinfo: true,
    publicPath: '/',
  },
  // webpack-dev-server options.
  devServer: {
    // activate hot reloading.
    hot: true,
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
  module: {
    rules: [
      ...browserBaseConfig.module.rules.map(rule => {
        if (rule.loader === 'babel-loader') {
          return {
            ...rule,
            query: {
              presets: [
                [
                  'env',
                  {
                    targets: {
                      browsers: ['last 2 versions', '> 1%'],
                    },
                    modules: false,
                  },
                ],
              ],
              plugins: ['react-hot-loader/babel', 'transform-class-properties'],
            },
          }
        }

        return rule
      }),
    ],
  },
  devtool: 'eval', // no SourceMap, but named modules. Fastest at the expense of detail.
  plugins: [
    ...browserBaseConfig.plugins,
    // Prevent naming issues.
    new ForceCaseSensitivityPlugin(),
    // Activates HMR.
    new webpack.HotModuleReplacementPlugin(),
    // Prints more readable module names in the browser console on HMR updates.
    new webpack.NamedModulesPlugin(),
  ],
}
