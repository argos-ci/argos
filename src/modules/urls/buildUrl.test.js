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
      expect(await formatUrlFromBuild(build)).toBe(`/orga-1/repo-1/builds/${build.id}`)
      expect(await formatUrlFromBuild(build, { absolute: true }))
        .toBe(`http://www.argos-ci.test/orga-1/repo-1/builds/${build.id}`)
    })
  })
})
