import type { RedisClientType } from "redis";

import parentLogger from "@/logger";

const logger = parentLogger.child({ module: "redis-pubsub" });

/**
 * Create a Redis-backed publish/subscribe client used to power GraphQL
 * subscriptions.
 *
 * Publishing reuses the shared Redis connection. Subscribing needs a dedicated
 * connection (a connection in subscriber mode cannot run regular commands), so
 * we lazily open a single duplicated connection and multiplex every
 * subscription over it as a per-channel listener. Redis fans events out to all
 * server instances, so this keeps working across a horizontally-scaled web
 * tier — a mutation handled by one instance reaches subscribers on every
 * other.
 */
export function createRedisPubSubClient(options: {
  getRedisClient: () => Promise<RedisClientType>;
}) {
  const { getRedisClient } = options;

  let subscriberPromise: Promise<RedisClientType> | null = null;

  function getSubscriber(): Promise<RedisClientType> {
    if (!subscriberPromise) {
      const promise = (async () => {
        const client = await getRedisClient();
        const subscriber: RedisClientType = client.duplicate();
        subscriber.on("error", (error: unknown) => {
          logger.error({ error }, "Redis subscriber error");
        });
        await subscriber.connect();
        return subscriber;
      })();
      // Drop the cached promise on failure so the next caller retries instead
      // of reusing a rejected connection.
      promise.catch(() => {
        if (subscriberPromise === promise) {
          subscriberPromise = null;
        }
      });
      subscriberPromise = promise;
    }
    return subscriberPromise;
  }

  return {
    /**
     * Publish a JSON-serializable payload to a channel.
     */
    async publish(channel: string, payload: unknown): Promise<void> {
      const client = await getRedisClient();
      await client.publish(channel, JSON.stringify(payload));
    },

    /**
     * Subscribe to a channel and yield each published payload until the
     * iterator is closed. Closing it — which `for await` does on break/return,
     * and GraphQL does when a subscription ends — removes the listener and
     * leaves the shared connection open for the other subscribers.
     */
    subscribe(channel: string): AsyncIterableIterator<unknown> {
      // Yields the raw parsed payloads; the caller is responsible for
      // validating their shape (these values come off the wire).
      //
      // Bridge the callback-based Redis subscription to an async iterator:
      // messages received while no consumer is waiting are buffered in
      // `pushQueue`; consumers that call `next()` with an empty buffer park
      // their resolver in `pullQueue` until the next message arrives.
      const pushQueue: unknown[] = [];
      const pullQueue: ((result: IteratorResult<unknown>) => void)[] = [];
      let closed = false;
      let subscriber: RedisClientType | null = null;

      const listener = (message: string) => {
        let value: unknown;
        try {
          value = JSON.parse(message);
        } catch (error) {
          logger.error({ error, channel }, "Failed to parse pub/sub message");
          return;
        }
        const pull = pullQueue.shift();
        if (pull) {
          pull({ value, done: false });
        } else {
          pushQueue.push(value);
        }
      };

      const ready = getSubscriber().then(async (sub) => {
        subscriber = sub;
        await sub.subscribe(channel, listener);
      });

      async function close(): Promise<void> {
        if (closed) {
          return;
        }
        closed = true;
        for (const pull of pullQueue.splice(0)) {
          pull({ done: true, value: undefined });
        }
        pushQueue.length = 0;
        try {
          await ready;
          await subscriber?.unsubscribe(channel, listener);
        } catch (error) {
          logger.error(
            { error, channel },
            "Failed to unsubscribe from pub/sub channel",
          );
        }
      }

      const iterator: AsyncIterableIterator<unknown> = {
        async next(): Promise<IteratorResult<unknown>> {
          if (closed) {
            return { done: true, value: undefined };
          }
          // Wait for the subscription to be established so a connection
          // failure surfaces here instead of hanging forever.
          await ready;
          if (pushQueue.length > 0) {
            return { value: pushQueue.shift(), done: false };
          }
          return new Promise<IteratorResult<unknown>>((resolve) => {
            pullQueue.push(resolve);
          });
        },
        async return(): Promise<IteratorResult<unknown>> {
          await close();
          return { done: true, value: undefined };
        },
        async throw(error?: unknown): Promise<IteratorResult<unknown>> {
          await close();
          return Promise.reject(error);
        },
        [Symbol.asyncIterator]() {
          return iterator;
        },
      };
      return iterator;
    },
  };
}
