const path = require('path')

module.exports = {
  tests: path.resolve(__dirname, '.vrtest/tests.js'),
  testUrl: process.env.DOCKER_TEST_URL || 'http://10.200.10.1:3090',
  storage: {
    output: path.resolve(__dirname, '.vrtest'),
    baseline: path.resolve(__dirname, 'screenshots'),
  },
  selenium: {
    server: 'http://127.0.0.1:4444/wd/hub',
  },
  server: {
    host: '0.0.0.0',
    port: 3090,
  },
  profiles: [
    {
      name: 'chrome',
      desiredCapabilities: {
        browserName: 'chrome',
      },
    },
    {
      name: 'firefox',
      desiredCapabilities: {
        browserName: 'firefox',
      },
    },
  ],
}
