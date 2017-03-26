import playback from 'server/test/playback'
import { useDatabase } from 'server/test/utils'
import factory from 'server/test/factory'
import baseCompare from './baseCompare'

describe('baseCompare', () => {
  useDatabase()

  let repository

  playback({
    name: 'baseCompare.json',
    mode: 'dryrun',
    // mode: 'record',
  })

  beforeEach(async () => {
    const organization = await factory.create('Organization', {
      login: 'callemall',
    })
    const user = await factory.create('User', {
      accessToken: 'foo',
    })
    repository = await factory.create('Repository', {
      name: 'material-ui',
      organizationId: organization.id,
    })
    await factory.create('UserRepositoryRight', { userId: user.id, repositoryId: repository.id })
  })

  // History:
  // * | - 3304d38afd1838cadf4e859de46b495fb347efec
  // * 0e4c8e8ee37c9f62c4e77f5b8d1abe3ebe845a92
  it('should work with a rebased PR', async () => {
    const screenshotBucket = await factory.create('ScreenshotBucket', {
      commit: '0e4c8e8ee37c9f62c4e77f5b8d1abe3ebe845a92',
      repositoryId: repository.id,
    })

    const { baseScreenshotBucket, compareCommitFound } = await baseCompare({
      baseCommit: '0e4c8e8ee37c9f62c4e77f5b8d1abe3ebe845a92',
      compareCommit: '3304d38afd1838cadf4e859de46b495fb347efec',
      repository,
      perPage: 5,
    })

    expect(baseScreenshotBucket.id).toBe(screenshotBucket.id)
    expect(compareCommitFound).toBe(true)
  })

  // History:
  // * e97e6d9054ac1b4f6f9ef55ff3d7ed8cc18394bd
  // * | - 3304d38afd1838cadf4e859de46b495fb347efec
  // * 0e4c8e8ee37c9f62c4e77f5b8d1abe3ebe845a92
  it('should work with a non rebase PR', async () => {
    const screenshotBucket1 = await factory.create('ScreenshotBucket', {
      commit: '0e4c8e8ee37c9f62c4e77f5b8d1abe3ebe845a92',
      repositoryId: repository.id,
    })
    await factory.create('ScreenshotBucket', {
      commit: 'e97e6d9054ac1b4f6f9ef55ff3d7ed8cc18394bd',
      repositoryId: repository.id,
    })

    const { baseScreenshotBucket } = await baseCompare({
      baseCommit: 'e97e6d9054ac1b4f6f9ef55ff3d7ed8cc18394bd',
      compareCommit: '3304d38afd1838cadf4e859de46b495fb347efec',
      repository,
      perPage: 5,
    })

    expect(baseScreenshotBucket.id).toBe(screenshotBucket1.id)
  })

  it('should fallback to master if no fork commit is found', async () => {
    const screenshotBucket = await factory.create('ScreenshotBucket', {
      branch: 'master',
      repositoryId: repository.id,
    })

    const { baseScreenshotBucket } = await baseCompare({
      baseCommit: 'master',
      compareCommit: '3304d38afd1838cadf4e859de46b495fb347efec',
      repository,
      perPage: 5,
    })

    expect(baseScreenshotBucket.id).toBe(screenshotBucket.id)
  })

  it('should return an empty compare commit when not found', async () => {
    const { compareCommitFound } = await baseCompare({
      baseCommit: 'master',
      compareCommit: '1304d38afd1838cadf4e859de46b495fb347efec',
      repository,
      perPage: 5,
    })
    expect(compareCommitFound).toBe(false)
  })
})
