import nock from 'nock'
import path from 'path'

nock.back.fixtures = path.join(__dirname, '../../../test/fixtures')

function playback(options) {
  const { name, mode } = options

  let nockDoneSaved

  global.beforeAll(done => {
    nock.back.setMode(mode)
    // eslint-disable-next-line prefer-arrow-callback
    nock.back(name, function teardown(nockDone) {
      nock.enableNetConnect()
      // eslint-disable-next-line no-console
      console.log(`playback: isLoaded ${!!this.isLoaded}, isRecording ${!!this.isRecording}`)
      nockDoneSaved = nockDone
      done()
    })
  })

  global.afterAll(() => {
    nockDoneSaved()
  })
}

export default playback
