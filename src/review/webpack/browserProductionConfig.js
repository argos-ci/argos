import webpack from 'webpack';
import browserBaseConfig from './browserBaseConfig';

export default {
  ...browserBaseConfig,
  plugins: [
    new webpack.optimize.UglifyJsPlugin({
      compress: {
        warnings: false,
        screw_ie8: true,
      },
      output: {
        comments: false,
      },
    }),
  ],
};
