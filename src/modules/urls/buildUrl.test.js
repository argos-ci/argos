import { useDatabase } from 'server/test/utils'
import factory from 'server/test/factory'
import { formatUrlFromBuild } from './buildUrl'

describe('buildUrl', () => {
  let build

  useDatabase()

  describe('#formatUrlFromBuild', () => {
    beforeEach(async () => {
      build = await factory.create('Build')
    })

    it('should return url', async () => {
      expect(await formatUrlFromBuild(build)).toBe(
        `http://www.test.argos-ci.com/orga-1/repo-1/builds/${build.id}`
      )
    })
  })
})
