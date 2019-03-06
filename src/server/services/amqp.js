import amqp from 'amqplib'
import config from 'config'

let amqpConnectionPromise

export function connect() {
  if (!amqpConnectionPromise) {
    amqpConnectionPromise = amqp.connect(config.get('amqp.url'))
  }

  return amqpConnectionPromise
}

export async function disconnect() {
  if (!amqpConnectionPromise) {
    return
  }

  const connection = await amqpConnectionPromise
  try {
    await connection.close()
  } catch (error) {
    throw error
  }
}

let channel
export async function getChannel() {
  if (!channel) {
    const connection = await connect()
    channel = await connection.createChannel()
  }

  return channel
}
