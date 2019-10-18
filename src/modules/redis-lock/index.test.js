import redis from 'redis'
import { promisify } from 'util'
import config from 'config'
import { createRedisLock } from '.'

function delay(time) {
  return new Promise(resolve => setTimeout(resolve, time))
}

function createResolvablePromise() {
  let resolve
  const promise = new Promise(r => {
    resolve = r
  })
  promise.resolve = resolve
  return promise
}

describe('redis-lock', () => {
  let client

  beforeEach(async () => {
    client = redis.createClient({ url: config.get('redis.url') })
    await promisify(client.del).bind(client)('lock.x')
  })

  afterEach(async () => {
    await promisify(client.quit).bind(client)()
  })

  it('takes lock', async () => {
    const lock = createRedisLock(client)
    const p1 = createResolvablePromise()
    const spy1 = jest.fn()
    const spy2 = jest.fn()
    lock('x', async () => p1).then(spy1)
    lock('x', async () => 'second', { retryDelay: 30 }).then(spy2)
    await delay(10)
    expect(spy1).not.toHaveBeenCalled()
    expect(spy2).not.toHaveBeenCalled()
    p1.resolve('first')
    await delay(10)
    expect(spy1).toHaveBeenCalledWith('first')
    expect(spy2).not.toHaveBeenCalledWith('second')
    await delay(50)
    expect(spy2).toHaveBeenCalledWith('second')
  })
})
