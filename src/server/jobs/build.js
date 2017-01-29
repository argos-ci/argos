import { getChannel } from 'server/amqp'
import createBuildDiffs from 'modules/build/createBuildDiffs'
import crashReporter from 'modules/crashReporter/crashReporter'
import { push as pushScreenshotDiffJob } from 'server/jobs/screenshotDiff'

const QUEUE = 'build'

export async function push(buildId) {
  const channel = await getChannel()
  await channel.assertQueue(QUEUE, { durable: true })
  channel.sendToQueue(QUEUE, new Buffer(buildId), { persistent: true })
}

export async function worker() {
  const channel = await getChannel()
  await channel.assertQueue(QUEUE, { durable: true })
  await channel.prefetch(1)
  await channel.consume(QUEUE, async (msg) => {
    try {
      const buildId = msg.content.toString()
      const screenshotDiffs = await createBuildDiffs(buildId)
      await Promise.all(screenshotDiffs.map(({ id }) => pushScreenshotDiffJob(id)))
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
