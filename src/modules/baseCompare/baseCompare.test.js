import nock from 'nock'
import playback from 'server/test/playback'
import { useDatabase } from 'server/test/utils'
import factory from 'server/test/factory'
import baseCompare from './baseCompare'

function nockGithub(branch) {
  return nock('https://api.github.com:443').get(
    `/repos/callemall/material-ui/commits?sha=${branch}` +
      '&page=1&per_page=100&access_token=ACCESS_TOKEN'
  )
}

describe('baseCompare', () => {
  useDatabase()

  let repository

  beforeEach(async () => {
    const organization = await factory.create('Organization', { login: 'callemall' })
    const user = await factory.create('User', { accessToken: 'ACCESS_TOKEN' })
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
        compareScreenshotBucket: screenshotBucket,
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
    // * | - 3304d38afd1838cadf4e859de46b495fb347efec (branch)
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
        compareScreenshotBucket: screenshotBucket2,
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
        compareScreenshotBucket: screenshotBucket,
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
    nockGithub('master').reply(401, {
      message: 'Bad credentials',
      documentation_url: 'https://developer.github.com/v3',
    })

    nockGithub('7abbb0e131ec5b3f6ab8e54a25b047705a013864').reply(401, {
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
      commit: '7abbb0e131ec5b3f6ab8e54a25b047705a013864',
    })
    const build = await factory.create('Build', {
      repositoryId: repository.id,
      baseScreenshotBucket: null,
      compareScreenshotBucket: screenshotBucket2,
    })

    const baseScreenshotBucket = await baseCompare({
      baseCommit: 'master',
      compareCommit: '7abbb0e131ec5b3f6ab8e54a25b047705a013864',
      build,
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
        compareScreenshotBucket: screenshotBucket2,
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

  // History:
  // * e97e6d9054ac1b4f6f9ef55ff3d7ed8cc18394bd (master)
  // * | - 3304d38afd1838cadf4e859de46b495fb347efec (branch)
  // * | - 0e4c8e8ee37c9f62c4e77f5b8d1abe3ebe845a92
  // * d2e624599bff1f9103bca64848fe17768da9cfa6
  it('should try every commits available', async () => {
    nockGithub('master').reply(200, [
      { sha: 'e97e6d9054ac1b4f6f9ef55ff3d7ed8cc18394bd' },
      { sha: 'd2e624599bff1f9103bca64848fe17768da9cfa6' },
    ])

    nockGithub('3304d38afd1838cadf4e859de46b495fb347efec').reply(200, [
      { sha: '3304d38afd1838cadf4e859de46b495fb347efec' },
      { sha: '0e4c8e8ee37c9f62c4e77f5b8d1abe3ebe845a92' },
      // We are missing that information
      // { sha: 'd2e624599bff1f9103bca64848fe17768da9cfa6' },
    ])

    const screenshotBucket1 = await factory.create('ScreenshotBucket', {
      commit: 'd2e624599bff1f9103bca64848fe17768da9cfa6',
      repositoryId: repository.id,
    })
    const screenshotBucket2 = await factory.create('ScreenshotBucket', {
      commit: 'e97e6d9054ac1b4f6f9ef55ff3d7ed8cc18394bd',
      repositoryId: repository.id,
    })
    const build = await factory.create('Build', {
      repositoryId: repository.id,
      baseScreenshotBucket: null,
      compareScreenshotBucket: screenshotBucket2,
    })

    const baseScreenshotBucket = await baseCompare({
      baseCommit: 'master',
      compareCommit: '3304d38afd1838cadf4e859de46b495fb347efec',
      build,
    })

    expect(baseScreenshotBucket.id).toBe(screenshotBucket1.id)
  })
})
