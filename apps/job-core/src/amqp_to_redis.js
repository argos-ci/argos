import redis from 'redis'
import { v4 as uuid } from 'uuid'
import { promisify } from 'util'

const sleep = promisify(setTimeout)

class AMQPToRedis {
  constructor(redis_url) {
    this.client = redis.createClient({ url: redis_url })
    this.lpop = promisify(this.client.lpop).bind(this.client)
    this.quit = promisify(this.client.quit).bind(this.client)
    this.closed = false
    this.ack_callbacks = {}
    this.exec_message = promisify((content, message_callback, callback) => {
      const id = uuid()
      this.ack_callbacks[id] = callback
      message_callback({id: id, content: content})
    }).bind(this)
  }

  queueName(queue) {
    return 'queue_' + queue
  }

  ack(message) {
    const callback = this.ack_callbacks[message.id]
    if (callback) {
      this.ack_callbacks[message.id] = null
      callback()
    }
  }

  nack(message, _allUpTo = false, _requeue = false) {
    this.ack(message)
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
        await sleep(2000)
      }
      else {
        await this.exec_message(res, message_callback)
      }
    }
  }
}

export const buildAMQPToRedis = (redis_url) => {
  return new AMQPToRedis(redis_url)
}