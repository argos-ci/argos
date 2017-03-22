import { useDatabase } from 'server/test/utils'
import factory from 'server/test/factory'
import synchronize from './synchronize'
import GitHubSynchronizer from './GitHubSynchronizer'

jest.mock('./GitHubSynchronizer')

describe('#synchronize', () => {
  useDatabase()

  beforeAll(() => {
    GitHubSynchronizer.prototype.synchronize = jest.fn()
  })

  let user
  let synchronization

  beforeEach(async () => {
    user = await factory.create('User')

    synchronization = await factory.create('Synchronization', {
      userId: user.id,
      jobStatus: 'pending',
      type: 'github',
    })
  })

  it('should call synchronizer', async () => {
    await synchronize(synchronization)
    expect(GitHubSynchronizer).toBeCalledWith(expect.objectContaining({ id: synchronization.id }))
  })
})
