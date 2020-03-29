#!/usr/bin/env node

import { callbackify } from 'util'
import { getAmqpChannel } from '@argos-ci/job-core'

/**
 * Sometimes, the buildAndSynchronise job crashes (Out of Memory) because of a build message
 * which, for some reason, make NodeJS runs out of memory. By consuming that message and de-enqueuing it,
 * we can safely restart the job.
 */

const queue = 'build'

const parseMessage = message => {
  const payload = JSON.parse(message.toString())
  if (
    !payload ||
    !Array.isArray(payload.args) ||
    !Number.isInteger(payload.attempts)
  ) {
    throw new Error('Invalid payload')
  }
  return payload
}

const main = callbackify(async () => {
  const channel = await getAmqpChannel()
  await channel.prefetch(1)
  await channel.assertQueue(queue, { durable: true })
  try {
    const msg = await channel.get(queue, { noAck: false })
    const payload = parseMessage(msg.content)
    console.log(payload) // eslint-disable-line
    channel.ack(msg)
  } catch (error) {
    console.log('ERROR consuming', error) // eslint-disable-line
  }

  await channel.close()
})

main(err => {
  if (err) throw err
  process.kill(process.pid)
})
