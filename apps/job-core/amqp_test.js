import 'server/bootstrap/setup'
import { getChannel, disconnect } from 'server/services/amqp'
const sleep = require('util').promisify(setTimeout)

const run = async () => {
  const queue = 'queue_test'
  const channel = await getChannel()
  while(true) {
    const message = await channel.get(queue, { noAck: false })
    if (message === false) {
      break;
    }
  }
  channel.sendToQueue(queue, Buffer.from(JSON.stringify({foo: 'bar', bar: 2})), { persistent: true })
  channel.sendToQueue(queue, Buffer.from(JSON.stringify({foo: 'bar', bar: 3})), { persistent: true })
  channel.sendToQueue(queue, Buffer.from(JSON.stringify({foo: 'bar', bar: 4})), { persistent: true })
  setTimeout(() => {
    channel.sendToQueue(queue, Buffer.from(JSON.stringify({foo: 'bar', bar: 5})), { persistent: true })
  }, 5000)
  await channel.prefetch(1)
  await channel.assertQueue(queue, { durable: true })
  try {
    const msg = await channel.get(queue, { noAck: false })
    const payload = JSON.parse(msg.content.toString())
    console.log(payload) // eslint-disable-line
    channel.ack(msg)
  } catch (error) {
    console.log('ERROR consuming', error) // eslint-disable-line
  }
  let counter = 0
  channel.consume(queue, async msg => {
    const payload = JSON.parse(msg.content.toString())
    console.log(payload) // eslint-disable-line
    await sleep(1000)
    channel.nack(msg, false, false)
    counter += 1
    if (counter == 3) {
      await channel.close()
      await disconnect()
    }
  })
}

run()