import logger from '@argos-ci/logger'
import { getAmqpChannel } from './amqp'

export async function createJobWorker(...jobs) {
  try {
    const channel = await getAmqpChannel()
    await Promise.all(
      jobs.map(job => {
        logger.info(`Start consuming ${job.queue} queue`)
        return job.process({ channel })
      }),
    )
  } catch (error) {
    setTimeout(() => {
      throw error
    })
  }
}
