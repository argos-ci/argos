import nock from 'nock'
import path from 'path'

nock.back.fixtures = path.join(process.cwd(), 'test', 'fixtures')

function playback(options) {
  const {
    name,
    mode,
  } = options

  nock.back.setMode(mode)

  let nockDoneSaved

  global.beforeAll((done) => {
    nock.back(name, function (nockDone) {
      nockDoneSaved = nockDone
      done()
    })
  })

  global.afterAll(() => {
    nockDoneSaved()
  })
}

export default playback
