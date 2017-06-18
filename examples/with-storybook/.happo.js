const FirefoxTarget = require('happo-target-firefox')

module.exports = {
  snapshotsFolder: 'screenshots',
  targets: [
    new FirefoxTarget({
      name: 'firefox',
      sourceFiles: ['.happo/tests.js'],
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
    }),
  ],
}
