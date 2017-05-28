describe('wdio-visual-regression-service', () => {
  it('checkViewport', async () => {
    await browser.url('https://github.com/argos-ci/argos/')
    await browser.pause(2e3)
    await browser.checkViewport()
  })

  // it('checkDocument', async () => {
  //   await browser.url('https://github.com/argos-ci/argos/')
  //   await browser.pause(2e3)
  //   await browser.checkDocument()
  // })

  // it('checkElement', async () => {
  //   await browser.url('https://github.com/argos-ci/argos/')
  //   await browser.pause(2e3)
  //   await browser.checkElement('.overall-summary')
  // })
})
