module.exports = {
  // tells nightwatch where to look for tests.
  src_folders: ['test'],
  selenium: {
    port: 4444,
  },
  test_settings: {
    // A "default" environment is required.
    // All the other environments are inheriting from default and can overwrite settings as needed.
    default: {
      // A url which can be used later in the tests as the main url to load.
      launch_url: '',
      // The hostname/IP on which the selenium server is accepting connections.
      selenium_host: 'localhost',
      // The port number on which the selenium server is accepting connections.
      selenium_port: 4444,
      screenshots: {
        enabled: true,
        path: 'screenshots',
      },
    },
    chrome: {
      desiredCapabilities: {
        browserName: 'chrome',
      },
    },
    firefox: {
      desiredCapabilities: {
        browserName: 'firefox',
      },
    },
  },
}
