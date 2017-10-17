import { getChannel } from 'server/services/amqp'
import crashReporter from 'modules/crashReporter/common'

const serializeMessage = payload => new Buffer(JSON.stringify(payload))
const parseMessage = message => {
  const payload = JSON.parse(message.toString())
  if (!payload || !Array.isArray(payload.args) || !Number.isInteger(payload.attempts)) {
    throw new Error('Invalid payload')
  }
  return payload
}

const logAndCaptureError = (error, { args, queue }) => {
  crashReporter().captureException(error, {
    tags: {
      jobQueue: queue,
    },
    extra: {
      jobArgs: args,
    },
  })
}

const createJob = (queue, consumer) => ({
  queue,
  async push(...args) {
    const channel = await getChannel()
    await channel.assertQueue(queue, { durable: true })
    channel.sendToQueue(queue, serializeMessage({ args, attempts: 0 }), { persistent: true })
  },
  async process({ channel }) {
    await channel.prefetch(1)
    await channel.assertQueue(queue, { durable: true })
    await channel.consume(queue, async msg => {
      let payload

      try {
        payload = parseMessage(msg.content)
        await consumer.perform(...payload.args)
        await consumer.complete(...payload.args)
      } catch (error) {
        logAndCaptureError(error, {
          args: payload.args,
          queue,
        })
        channel.nack(msg, false, false)
        // Retry two times
        if (payload && payload.attempts < 2) {
          channel.sendToQueue(
            queue,
            serializeMessage({
              args: payload.args,
              attempts: payload.attempts + 1,
            }),
            { persistent: true }
          )
        } else {
          await consumer.error(...payload.args)
        }
        return
      }

      channel.ack(msg)
    })
  },
})

export default createJob
