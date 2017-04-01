import nock from 'nock'
import playback from 'server/test/playback'
import { useDatabase } from 'server/test/utils'
import factory from 'server/test/factory'
import baseCompare from './baseCompare'

describe('baseCompare', () => {
  useDatabase()

  let repository

  beforeEach(async () => {
    const organization = await factory.create('Organization', {
      login: 'callemall',
    })
    const user = await factory.create('User', {
      accessToken: 'ACCESS_TOKEN',
    })
    repository = await factory.create('Repository', {
      name: 'material-ui',
      organizationId: organization.id,
    })
    await factory.create('UserRepositoryRight', {
      userId: user.id,
      repositoryId: repository.id,
    })
  })

  describe('simple cases', () => {
    playback({
      name: 'baseCompare.json',
      mode: 'dryrun',
      // mode: 'record',
    })

    // History:
    // * 3304d38afd1838cadf4e859de46b495fb347efec (branch)
    // * 0e4c8e8ee37c9f62c4e77f5b8d1abe3ebe845a92 (master)
    it('should work with a rebased PR', async () => {
      const screenshotBucket = await factory.create('ScreenshotBucket', {
        commit: '0e4c8e8ee37c9f62c4e77f5b8d1abe3ebe845a92',
        repositoryId: repository.id,
      })
      const build = await factory.create('Build', {
        repositoryId: repository.id,
        baseScreenshotBucket: null,
        comapreScreenshotBucket: screenshotBucket,
      })

      const baseScreenshotBucket = await baseCompare({
        baseCommit: '0e4c8e8ee37c9f62c4e77f5b8d1abe3ebe845a92',
        compareCommit: '3304d38afd1838cadf4e859de46b495fb347efec',
        build,
        perPage: 5,
      })

      expect(baseScreenshotBucket.id).toBe(screenshotBucket.id)
    })

    // History:
    // * e97e6d9054ac1b4f6f9ef55ff3d7ed8cc18394bd (master)
    // * | - 3304d38afd1838cadf4e859de46b495fb347efec
    // * 0e4c8e8ee37c9f62c4e77f5b8d1abe3ebe845a92
    it('should work with a non rebase PR', async () => {
      const screenshotBucket1 = await factory.create('ScreenshotBucket', {
        commit: '0e4c8e8ee37c9f62c4e77f5b8d1abe3ebe845a92',
        repositoryId: repository.id,
      })
      const screenshotBucket2 = await factory.create('ScreenshotBucket', {
        commit: 'e97e6d9054ac1b4f6f9ef55ff3d7ed8cc18394bd',
        repositoryId: repository.id,
      })
      const build = await factory.create('Build', {
        repositoryId: repository.id,
        baseScreenshotBucket: null,
        comapreScreenshotBucket: screenshotBucket2,
      })

      const baseScreenshotBucket = await baseCompare({
        baseCommit: 'e97e6d9054ac1b4f6f9ef55ff3d7ed8cc18394bd',
        compareCommit: '3304d38afd1838cadf4e859de46b495fb347efec',
        build,
        perPage: 5,
      })

      expect(baseScreenshotBucket.id).toBe(screenshotBucket1.id)
    })

    it('should fallback to master if no fork commit is found', async () => {
      const screenshotBucket = await factory.create('ScreenshotBucket', {
        branch: 'master',
        repositoryId: repository.id,
      })
      const build = await factory.create('Build', {
        repositoryId: repository.id,
        baseScreenshotBucket: null,
        comapreScreenshotBucket: screenshotBucket,
      })

      const baseScreenshotBucket = await baseCompare({
        baseCommit: 'master',
        compareCommit: '3304d38afd1838cadf4e859de46b495fb347efec',
        build,
        perPage: 5,
      })

      expect(baseScreenshotBucket.id).toBe(screenshotBucket.id)
    })
  })

  it('should fallback to master if no base commit found', async () => {
    nock('api.github.com')
      .get('/repos/callemall/material-ui/commits' +
        '?sha=master&page=1&per_page=5&access_token=ACCESS_TOKEN')
      .reply(401, {
        message: 'Bad credentials',
        documentation_url: 'https://developer.github.com/v3',
      })

    const screenshotBucket1 = await factory.create('ScreenshotBucket', {
      branch: 'master',
      repositoryId: repository.id,
    })
    const screenshotBucket2 = await factory.create('ScreenshotBucket', {
      branch: 'SCALE-123',
      repositoryId: repository.id,
      commit: '3304d38afd1838cadf4e859de46b495fb347efec',
    })
    const build = await factory.create('Build', {
      repositoryId: repository.id,
      baseScreenshotBucket: null,
      comapreScreenshotBucket: screenshotBucket2,
    })

    const baseScreenshotBucket = await baseCompare({
      baseCommit: 'master',
      compareCommit: '3304d38afd1838cadf4e859de46b495fb347efec',
      build,
      perPage: 5,
    })

    expect(baseScreenshotBucket.id).toBe(screenshotBucket1.id)
  })

  describe('master', () => {
    playback({
      name: 'baseCompareMaster.json',
      mode: 'dryrun',
      // mode: 'record',
    })

    // History:
    // * c5a2fb0c0fde1a6e541ccaa3e63d6789248ae771 (master)
    // * 8388279f9ddd5123e3440ada890db468c04b2e65
    // * 7abbb0e131ec5b3f6ab8e54a25b047705a013864
    it('should handle master commits correctly', async () => {
      await factory.create('ScreenshotBucket', {
        commit: 'c5a2fb0c0fde1a6e541ccaa3e63d6789248ae771',
        repositoryId: repository.id,
      })
      const screenshotBucket2 = await factory.create('ScreenshotBucket', {
        commit: '8388279f9ddd5123e3440ada890db468c04b2e65',
        repositoryId: repository.id,
      })
      const screenshotBucket3 = await factory.create('ScreenshotBucket', {
        commit: '7abbb0e131ec5b3f6ab8e54a25b047705a013864',
        repositoryId: repository.id,
      })
      const build = await factory.create('Build', {
        repositoryId: repository.id,
        baseScreenshotBucket: null,
        comapreScreenshotBucket: screenshotBucket2,
      })

      const baseScreenshotBucket = await baseCompare({
        baseCommit: 'c5a2fb0c0fde1a6e541ccaa3e63d6789248ae771',
        compareCommit: '8388279f9ddd5123e3440ada890db468c04b2e65',
        build,
        perPage: 5,
      })

      expect(baseScreenshotBucket.id).toBe(screenshotBucket3.id)
    })
  })
})
