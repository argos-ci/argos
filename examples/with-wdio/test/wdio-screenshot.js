function screenshotName(filename) {
  const browserName = browser.desiredCapabilities.browserName
  return `screenshots/${filename}-${browserName}.png`
}

describe('wdio-screenshot', () => {
  it('should test github', async () => {
    await browser.url('https://github.com/argos-ci/argos/')
    await browser.pause(2e3)
    await browser.saveViewportScreenshot(screenshotName('saveViewportScreenshot'))
    await browser.saveElementScreenshot(screenshotName('saveElementScreenshot'), '.overall-summary')
    await browser.saveDocumentScreenshot(screenshotName('saveDocumentScreenshot'))
  })
})
