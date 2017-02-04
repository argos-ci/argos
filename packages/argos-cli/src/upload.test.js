import path from 'path'
import upload from './upload'
import config from './config'

describe('upload', () => {
  beforeEach(() => {
    config.set('branch', 'master')
    config.set('commit', '0a5470f4d04d66501c126840e208a8f99d36e306')
    config.set('endpoint', 'http://localhost')
  })

  afterEach(() => {
    config.reset('branch')
    config.reset('commit')
    config.reset('endpoint')
  })

  it('should throw if missing branch', () => {
    config.set('branch', undefined)
    return upload(path.join(__dirname, '../__fixtures__/screenshots'), 'myToken')
      .catch((err) => {
        expect(err.message).toBe('Branch missing: use ARGOS_BRANCH to specify it.')
      })
  })

  it('should throw if missing commit', () => {
    config.set('commit', undefined)
    return upload(path.join(__dirname, '../__fixtures__/screenshots'), 'myToken')
      .catch((err) => {
        expect(err.message).toBe('Commit missing: use ARGOS_COMMIT to specify it.')
      })
  })
})
