import Synchronization from 'server/models/Synchronization'
import GitHubSynchronizer from './GitHubSynchronizer'

const SYNCHRONIZER_BY_TYPE = {
  github: GitHubSynchronizer,
}

async function synchronize(synchronizationId) {
  const synchronization = await Synchronization.query().eager('user').findById(synchronizationId)

  if (!synchronization) {
    throw new Error('Synchronization not found')
  }

  const Synchronizer = SYNCHRONIZER_BY_TYPE[synchronization.type]

  if (!Synchronizer) {
    throw new Error(`Unknown syncrhonization type: "${synchronization.type}"`)
  }

  const synchronizer = new Synchronizer(synchronization)

  await synchronization.$query().patch({ jobStatus: 'progress' })

  await synchronizer.synchronize(synchronization)

  await synchronization.$query().patch({ jobStatus: 'complete' })
}

export default synchronize
