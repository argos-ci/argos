import { getChannel } from 'server/amqp'
import crashReporter from 'modules/crashReporter/crashReporter'

const serializeMessage = payload => new Buffer(JSON.stringify(payload))
const parseMessage = (message) => {
  const payload = JSON.parse(message.toString())
  if (!Array.isArray(payload.args) || !Number.isInteger(payload.attempts)) {
    throw new Error('Invalid payload')
  }
  return payload
}

const logAndCaptureError = (error) => {
  console.error(error.message) // eslint-disable-line no-console
  console.error(error.stack) // eslint-disable-line no-console
  crashReporter.captureException(error)
}

const createJob = (queue, consume) => {
  return {
    async push(...args) {
      const channel = await getChannel()
      await channel.assertQueue(queue, { durable: true })
      channel.sendToQueue(queue, serializeMessage({ args, attempts: 0 }), { persistent: true })
    },
    async process({ channel }) {
      await channel.prefetch(1)
      await channel.assertQueue(queue, { durable: true })
      await channel.consume(queue, async (msg) => {
        let payload

        try {
          payload = parseMessage(msg.content)
          await consume(...payload.args)
        } catch (error) {
          logAndCaptureError(error)
          channel.nack(msg, false, false)
          // Retry two times
          if (payload && payload.attempts < 2) {
            channel.sendToQueue(queue, serializeMessage({
              args: payload.args,
              attempts: payload.attempts + 1,
            }), { persistent: true })
          }
          return
        }

        channel.ack(msg)
      })
    },
  }
}

export default createJob
