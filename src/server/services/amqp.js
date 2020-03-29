import amqp from 'amqplib'
import config from 'config'

import redis from 'redis'
import { promisify } from 'util'
const sleep = promisify(setTimeout)

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
  await connection.close()
}

class AMQPToRedis {
  constructor(client) {
    this.client = client
    this.lpop = promisify(client.lpop).bind(client)
    this.quit = promisify(client.quit).bind(client)
    this.closed = false
    this.exec_message = promisify((content, message_callback, callback) => {
      this.ack_callback = callback
      message_callback({content: content})
    }).bind(this)
  }

  queueName(queue) {
    return 'queue_' + queue
  }

  ack(_message) {
    if (this.ack_callback) {
      const callback = this.ack_callback
      this.ack_callback = null
      callback()
    }
  }
  nack(_message, _allUpTo = false, _requeue = false) {
    if (this.ack_callback) {
      const callback = this.ack_callback
      this.ack_callback = null
      callback()
    }
  }

  sendToQueue(queue, message, _opts) {
    this.client.rpush(this.queueName(queue), message, (error) => {
      if (error) {
        console.log(error)
      }
    })
  }
  async prefetch(_x) {}
  async assertQueue(_queue, _opts) {}
  async get(queue, _opts) {
    const res = await this.lpop(this.queueName(queue))
    if (res === null) {
      return false
    }
    else {
      return {content: res}
    }
  }

  async close() {
    this.closed = true
    this.quit()
  }

  async consume(queue, message_callback) {
    while(!this.closed) {
      const res = await this.lpop(this.queueName(queue))
      if (res === null) {
        await sleep(200)
      }
      else {
        await this.exec_message(res, message_callback)
      }
    }
  }
}

let channel
export async function getChannel() {
  if (config.get('amqp.url').startsWith('redis://')) {
    const client = redis.createClient({ url: config.get('amqp.url') })
    return new AMQPToRedis(client)
  }
  else {
    if (!channel) {
      const connection = await connect()
      channel = await connection.createChannel()
    }

    return channel
  }
}
