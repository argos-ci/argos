import { getChannel } from 'server/amqp'
import computeScreenshotDiff from 'modules/build/computeScreenshotDiff'

const QUEUE = 'screenshotDiff'

export async function push(screenshotDiffId) {
  const channel = await getChannel()
  await channel.assertQueue(QUEUE, { durable: true })
  channel.sendToQueue(QUEUE, new Buffer(screenshotDiffId), { persistent: true })
}

export async function worker() {
  const channel = await getChannel()
  await channel.assertQueue(QUEUE, { durable: true })
  await channel.prefetch(1)
  await channel.consume(QUEUE, async (msg) => {
    const screenshotDiffId = msg.content.toString()
    await computeScreenshotDiff(screenshotDiffId)
    channel.ack(msg)
  })
}
