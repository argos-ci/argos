function screenshotName(browser, filename) {
  const browserName = browser.options.desiredCapabilities.browserName
  return `screenshots/${filename}-${browserName}.png`
}

module.exports = {
  saveScreenshot: browser => {
    browser
      .url('https://github.com/argos-ci/argos/')
      .pause(1e3)
      .saveScreenshot(screenshotName(browser, 'saveScreenshot'))
      .end()
  },
}
