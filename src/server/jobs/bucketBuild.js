import { getChannel } from 'server/amqp'
import createBucketBuild from 'modules/build/createBucketBuild'
import createBuildDiffs from 'modules/build/createBuildDiffs'
import { push as pushScreenshotDiffJob } from 'server/jobs/screenshotDiff'

const QUEUE = 'bucketBuild'

export async function push(bucketId) {
  const channel = await getChannel()
  await channel.assertQueue(QUEUE, { durable: true })
  channel.sendToQueue(QUEUE, new Buffer(bucketId), { persistent: true })
}

export async function worker() {
  const channel = await getChannel()
  await channel.assertQueue(QUEUE, { durable: true })
  await channel.prefetch(1)
  await channel.consume(QUEUE, async (msg) => {
    const bucketId = msg.content.toString()
    const build = await createBucketBuild(bucketId)
    const screenshotDiffs = await createBuildDiffs(build.id)
    await Promise.all(screenshotDiffs.map(({ id }) => pushScreenshotDiffJob(id)))
    channel.ack(msg)
  })
}
