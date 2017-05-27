import redis from 'redis'
import config from 'config'

let redisClient

export function connect() {
  if (!redisClient) {
    redisClient = redis.createClient({ url: config.get('redis.url') })
  }

  return redisClient
}

export async function disconnect() {
  return new Promise((resolve, reject) => {
    if (!redisClient) {
      resolve()
      return
    }

    redisClient.quit(error => {
      if (error) {
        reject(error)
      } else {
        redisClient = null
        resolve()
      }
    })
  })
}
