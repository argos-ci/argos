const path = require('path')

module.exports = {
  entry: path.resolve(__dirname, 'react.js'),
  output: {
    path: path.resolve(__dirname, '../.happo'),
    filename: 'react.js',
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        loader: 'babel-loader',
        query: {
          cacheDirectory: true,
        },
      },
    ],
  },
}
