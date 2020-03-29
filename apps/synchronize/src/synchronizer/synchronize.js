import { GitHubSynchronizer } from './GitHubSynchronizer'

const SYNCHRONIZER_BY_TYPE = {
  github: GitHubSynchronizer,
}

export async function synchronize(synchronization) {
  const Synchronizer = SYNCHRONIZER_BY_TYPE[synchronization.type]

  if (!Synchronizer) {
    throw new Error(`Unknown synchronization type: "${synchronization.type}"`)
  }

  const synchronizer = new Synchronizer(synchronization)
  await synchronizer.synchronize(synchronization)
}
