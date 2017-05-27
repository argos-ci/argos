import { getChannel } from 'server/services/amqp'

const createJobWorker = async (...jobs) => {
  try {
    const channel = await getChannel()
    await Promise.all(jobs.map(job => job.process({ channel })))
  } catch (error) {
    setTimeout(() => {
      throw error
    })
  }
}

export default createJobWorker
