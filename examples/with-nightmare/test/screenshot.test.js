import Nightmare from 'nightmare'
import path from 'path'

describe('nightmare', () => {
  it('should screenshot', async () => {
    const nightmare = new Nightmare()

    await nightmare
      .goto('https://github.com/argos-ci/argos/')
      .screenshot(path.join(__dirname, '../screenshots/screenshot.png'))
      .end()
  })
})
