import { useDatabase } from 'server/test/utils'
import factory from 'server/test/factory'
import { formatUrlFromBuild } from './buildUrl'

describe('buildUrl', () => {
  useDatabase()

  describe('#formatUrlFromBuild', () => {
    it('should return url', async () => {
      const build = await factory.create('Build')
      const url = await formatUrlFromBuild(build)
      expect(url).toBe(`http://www.test.argos-ci.com/orga-1/repo-1/builds/${build.id}`)
    })
  })
})
