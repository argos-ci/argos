exports.config = {
  seleniumAddress: 'http://localhost:4444/wd/hub',
  specs: ['test/screenshot.js'],
  multiCapabilities: [
    {
      browserName: 'firefox',
    },
    {
      browserName: 'chrome',
    },
  ],
}
