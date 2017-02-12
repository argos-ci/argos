import { getChannel } from 'server/amqp'
import synchronize from 'modules/synchronizer/synchronize'
import crashReporter from 'modules/crashReporter/crashReporter'

const QUEUE = 'synchronize'

export async function push(synchronizationId) {
  const channel = await getChannel()
  await channel.assertQueue(QUEUE, { durable: true })
  channel.sendToQueue(QUEUE, new Buffer(synchronizationId), { persistent: true })
}

export async function worker() {
  const channel = await getChannel()
  await channel.assertQueue(QUEUE, { durable: true })
  await channel.prefetch(1)
  await channel.consume(QUEUE, async (msg) => {
    try {
      const synchronizationId = msg.content.toString()
      await synchronize(synchronizationId)
    } catch (error) {
      console.error(error.message) // eslint-disable-line no-console
      console.error(error.stack) // eslint-disable-line no-console
      crashReporter.captureException(error)
      channel.nack(msg, { requeue: true })
      return
    }
    channel.ack(msg)
  })
}
