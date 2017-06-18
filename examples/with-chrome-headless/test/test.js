/* eslint-disable no-console */

import fs from 'fs'
import CDP from 'chrome-remote-interface'

const url = 'https://github.com/argos-ci/argos'
const viewportWidth = 1440
const viewportHeight = 900
const delay = 0
const fullPage = true

// Start the Chrome Debugging Protocol
CDP(async client => {
  // Extract used DevTools domains.
  const { DOM, Emulation, Network, Page } = client

  // Enable events on domains we are interested in.
  await Page.enable()
  await DOM.enable()
  await Network.enable()

  // Set up viewport resolution, etc.
  await Emulation.setDeviceMetricsOverride({
    width: viewportWidth,
    height: viewportHeight,
    deviceScaleFactor: 0,
    mobile: false,
    fitWindow: false,
  })
  await Emulation.setVisibleSize({ width: viewportWidth, height: viewportHeight })

  // Navigate to target page
  await Page.navigate({ url })

  // Wait for page load event to take screenshot
  Page.loadEventFired(async () => {
    // If the `full` CLI option was passed, we need to measure the height of
    // the rendered page and use Emulation.setVisibleSize
    if (fullPage) {
      const domDocument = await DOM.getDocument()
      const bodyNode = await DOM.querySelector({
        selector: 'body',
        nodeId: domDocument.root.nodeId,
      })
      const boxModel = await DOM.getBoxModel({ nodeId: bodyNode.nodeId })

      await Emulation.setVisibleSize({ width: viewportWidth, height: boxModel.model.height })

      // This forceViewport call ensures that content outside the viewport is
      // rendered, otherwise it shows up as grey. Possibly a bug?
      await Emulation.forceViewport({ x: 0, y: 0, scale: 1 })
    }

    setTimeout(async () => {
      const screenshot = await Page.captureScreenshot({ format: 'png' })
      const buffer = new Buffer(screenshot.data, 'base64')
      fs.writeFile('screenshots/output.png', buffer, 'base64', err => {
        if (err) {
          console.error(err)
        } else {
          console.log('Screenshot saved')
        }
        client.close()
      })
    }, delay)
  })
}).on('error', err => {
  console.error('Cannot connect to browser:', err)
})
