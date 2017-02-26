import * as database from 'server/services/database'
import * as redis from 'server/services/redis'
import * as amqp from 'server/services/amqp'

export async function disconnect() {
  await database.disconnect()
  await redis.disconnect()
  await amqp.disconnect()
}
