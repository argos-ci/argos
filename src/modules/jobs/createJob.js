import { getChannel } from 'server/amqp'
import crashReporter from 'modules/crashReporter/crashReporter'

const createJob = (queue, consume) => {
  return {
    async push(...args) {
      const channel = await getChannel()
      await channel.assertQueue(queue, { durable: true })
      channel.sendToQueue(queue, new Buffer(JSON.stringify(args)), { persistent: true })
    },
    async process({ channel }) {
      await channel.prefetch(1)
      await channel.assertQueue(queue, { durable: true })
      await channel.consume(queue, async (msg) => {
        try {
          const args = JSON.parse(msg.content.toString())
          await consume(...args)
        } catch (error) {
          console.error(error.message) // eslint-disable-line no-console
          console.error(error.stack) // eslint-disable-line no-console
          crashReporter.captureException(error)
          channel.nack(msg, { requeue: true })
          return
        }

        channel.ack(msg)
      })
    },
  }
}

export default createJob
