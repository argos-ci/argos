import path from 'path'
import webpack from 'webpack'

export default {
  entry: [
    './src/review/review.js',
  ],
  output: {
    path: path.join(__dirname, '../../../server/static/review'),
    publicPath: '/static/review/',
    pathinfo: false,
    filename: '[name].[hash].js',
    sourceMapFilename: '[name].[hash].map.js',
    chunkFilename: '[id].chunk.[chunkhash].js',
  },
  target: 'web',
  resolve: {
    extensions: ['.js'],
    modules: [
      path.join(__dirname, '../../'),
      'node_modules',
    ],
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        loader: 'babel-loader',
        exclude: /node_modules\/(?!material-ui)/,
      },
      {
        test: /\.json$/,
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
            plugins: [{
              convertPathData: {
                floatPrecision: 2,
              },
            }],
          },
        },
      },
      {
        test: /\.html$/,
        loader: 'html-loader',
      },
    ],
  },
  performance: {
    maxAssetSize: 4e6,
    maxEntrypointSize: 6e6,
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env.PLATFORM': JSON.stringify('browser'),
    }),
  ],
}
