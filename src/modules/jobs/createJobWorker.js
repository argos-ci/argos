import display from 'modules/scripts/display'
import { getChannel } from 'server/services/amqp'

const createJobWorker = async (...jobs) => {
  try {
    const channel = await getChannel()
    await Promise.all(
      jobs.map(job => {
        display.info(`Start consuming ${job.queue} queue`)
        return job.process({ channel })
      })
    )
  } catch (error) {
    setTimeout(() => {
      throw error
    })
  }
}

export default createJobWorker
