const fs = require('fs')
const path = require('path')

function screenshot(name) {
  Promise.all([browser.takeScreenshot(), browser.getCapabilities()]).then(([png, capabilities]) => {
    const filename = `${name}-${capabilities.get('browserName')}.png`
    const stream = fs.createWriteStream(path.join(__dirname, '../screenshots', filename))
    stream.write(new Buffer(png, 'base64'))
    stream.end()
  })
}

describe('protractor', () => {
  it('should take a screenshot', () => {
    browser.get('https://angular.io/')
    browser.sleep(2e3)
    screenshot('angularjs')
  })
})
