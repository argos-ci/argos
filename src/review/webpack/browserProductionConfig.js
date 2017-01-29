import webpack from 'webpack'
import AssetsPlugin from 'assets-webpack-plugin'
import browserBaseConfig from './browserBaseConfig'

export default {
  ...browserBaseConfig,
  plugins: [
    ...browserBaseConfig.plugins,
    new AssetsPlugin({
      filename: './server/static/review/assets.json',
      prettyPrint: true,
    }),
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify('production'),
    }),
    // new webpack.optimize.UglifyJsPlugin({
    //   compress: {
    //     warnings: false,
    //     screw_ie8: true,
    //   },
    //   output: {
    //     comments: false,
    //   },
    // }),
  ],
}
