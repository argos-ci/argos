import { GitHubSynchronizer } from './github/synchronizer'

export async function synchronize(synchronization) {
  const synchronizer = new GitHubSynchronizer(synchronization)
  await synchronizer.synchronize()
}
