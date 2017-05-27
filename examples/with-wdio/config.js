import path from 'path'
// eslint-disable-next-line import/no-commonjs
const VisualRegressionCompare = require('wdio-visual-regression-service/compare')

function screenshotName(context) {
  const testName = context.test.title.replace(/ /g, '_')
  const name = context.browser.name.toLocaleLowerCase().replace(/ /g, '_')
  const { width, height } = context.meta.viewport

  return path.join(__dirname, `screenshots/${testName}_${name}_${width}x${height}.png`)
}

const conf = {
  // Define which test specs should run. The pattern is relative to the directory
  // from which `wdio` was called. Notice that, if you are calling `wdio` from an
  // NPM script (see https://docs.npmjs.com/cli/run-script) then the current working
  // directory is where your package.json resides, so `wdio` will be called from there.
  specs: ['test/**'],
  // ============
  // Capabilities
  // ============
  // Define your capabilities here. WebdriverIO can run multiple capabilities at the same
  // time. Depending on the number of capabilities, WebdriverIO launches several test
  // sessions. Within your capabilities you can overwrite the spec and exclude options in
  // order to group specific specs to a specific capability.
  //
  // First, you can define how many instances should be started at the same time. Let's
  // say you have 3 different capabilities (Chrome, Firefox, and Safari) and you have
  // set maxInstances to 1; wdio will spawn 3 processes. Therefore, if you have 10 spec
  // files and you set maxInstances to 10, all spec files will get tested at the same time
  // and 30 processes will get spawned. The property handles how many capabilities
  // from the same test should run tests.
  maxInstances: 1,
  // If you have trouble getting all important capabilities together, check out the
  // Sauce Labs platform configurator - a great tool to configure your capabilities:
  // https://docs.saucelabs.com/reference/platforms-configurator
  capabilities: [
    {
      browserName: 'chrome',
    },
    {
      browserName: 'firefox',
    },
  ],
  // By default WebdriverIO commands are executed in a synchronous way using
  // the wdio-sync package. If you still want to run your tests in an async way
  // e.g. using promises you can set the sync option to false.
  sync: false,
  // Level of logging verbosity: silent | verbose | command | data | result | error
  logLevel: 'silent',
  // Saves a screenshot to a given path if a command fails.
  screenshotPath: './errorShots/',
  // Default timeout for all waitFor* commands.
  waitforTimeout: 10000,
  // Default timeout in milliseconds for request
  // if Selenium Grid doesn't send response
  connectionRetryTimeout: 90000,
  // Initialize the browser instance with a WebdriverIO plugin. The object should have the
  // plugin name as key and the desired plugin options as properties. Make sure you have
  // the plugin installed before running any tests.
  plugins: {
    'wdio-screenshot': {},
  },
  // Test runner services
  // Services take over a specific job you don't want to take care of. They enhance
  // your test setup with almost no effort. Unlike plugins, they don't add new
  // commands. Instead, they hook themselves up into the test process.
  services: ['visual-regression'],
  visualRegression: {
    compare: new VisualRegressionCompare.SaveScreenshot({
      screenshotName,
    }),
    viewportChangePause: 500, // ms
    viewports: [
      { width: 1024, height: 600 },
      // { width: 320, height: 480 },
    ],
  },
  // Options for selenium-standalone
  // Path where all logs from the Selenium server should be stored.
  seleniumLogs: './logs/',
  // Framework you want to run your specs with.
  framework: 'mocha',
  // Test reporter for stdout.
  reporters: ['dot'],
  // Options to be passed to Mocha.
  // See the full list at http://mochajs.org/
  mochaOpts: {
    ui: 'bdd',
    timeout: 5e4,
  },
}

export default conf
