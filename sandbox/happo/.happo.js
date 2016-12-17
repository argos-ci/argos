module.exports = {
  bind: '0.0.0.0',
  port: 5555,
  sourceFiles: [
    'example.js',
  ],
  stylesheets: [
    'css/styles.css',
  ],
  publicDirectories: [
    'public-root',
  ],
  viewports: {
    desktop: {
      width: 1024,
      height: 768,
    },
    mobile: {
      width: 320,
      height: 444,
    },
  },
};
