import path from 'path';

export default {
  entry: [
    './src/review/review.js',
  ],
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
        use: 'babel-loader',
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
        use: 'image-webpack-loader',
        options: {
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
    maxAssetSize: 2000000,
    maxEntrypointSize: 6000000,
  },
};
