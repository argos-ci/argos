import { getChannel } from '../amqp'

const QUEUE = 'hello'

export async function push() {
  const channel = await getChannel()
  await channel.assertQueue(QUEUE, { durable: true })
  channel.sendToQueue(QUEUE, new Buffer('hello'), { persistent: true })
}

export async function worker() {
  const channel = await getChannel()
  await channel.assertQueue(QUEUE, { durable: true })
  await channel.prefetch(1)
  await channel.consume(QUEUE, (msg) => {
    console.log(msg.content.toString()) // eslint-disable-line no-console
    channel.ack(msg)
  })
}
