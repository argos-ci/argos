import logger from '@argos-ci/logger'
import * as Sentry from '@sentry/node'
import { getAmqpChannel } from './amqp'

const serializeMessage = (payload) => Buffer.from(JSON.stringify(payload))
const parseMessage = (message) => {
  const payload = JSON.parse(message.toString())
  if (
    !payload ||
    !Array.isArray(payload.args) ||
    !Number.isInteger(payload.attempts)
  ) {
    throw new Error('Invalid payload')
  }
  return payload
}

export function createJob(queue, consumer) {
  return {
    queue,
    async push(...args) {
      const channel = await getAmqpChannel()
      await channel.assertQueue(queue, { durable: true })
      channel.sendToQueue(queue, serializeMessage({ args, attempts: 0 }), {
        persistent: true,
      })
    },
    async process({ channel }) {
      Sentry.configureScope((scope) => {
        scope.setTag('jobQueue', queue)
      })
      await channel.prefetch(1)
      await channel.assertQueue(queue, { durable: true })
      await channel.consume(queue, async (msg) => {
        let payload

        try {
          payload = parseMessage(msg.content)
          Sentry.configureScope((scope) => {
            scope.setExtra('jobArgs', payload.args)
          })
          await consumer.perform(...payload.args)
          await consumer.complete(...payload.args)
        } catch (error) {
          logger.error(error)
          if (!error.ignoreCapture) {
            Sentry.captureException(error)
          }
          channel.nack(msg, false, false)
          // Retry two times
          if (payload && payload.attempts < 2) {
            channel.sendToQueue(
              queue,
              serializeMessage({
                args: payload.args,
                attempts: payload.attempts + 1,
              }),
              { persistent: true },
            )
          } else {
            await consumer.error(...payload.args)
          }
          return
        }

        channel.ack(msg)
      })
    },
  }
}
