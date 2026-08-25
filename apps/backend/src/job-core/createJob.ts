import * as Sentry from "@sentry/node";
import { type Channel, IllegalOperationError } from "amqplib";
import pRetry from "p-retry";

import config from "@/config";
import parentLogger, { type Logger } from "@/logger";
import { checkIsRetryable } from "@/util/error";
import { redisLock } from "@/util/redis";

import { connect } from "./amqp";
import {
  DEFAULT_RETRY_LADDER,
  getRetryQueueName,
  getRetryQueueOptions,
  getRetryTier,
  type RetryTier,
} from "./backoff";

interface Payload<TValue> {
  args: [TValue];
  attempts: number;
}

const serializeMessage = <TValue>(payload: Payload<TValue>) =>
  Buffer.from(JSON.stringify(payload));

const checkIsValidPayload = <TValue>(value: any): value is Payload<TValue> => {
  return value && Array.isArray(value.args) && Number.isInteger(value.attempts);
};

const parseMessage = <TValue>(message: Buffer) => {
  const value = JSON.parse(message.toString());
  if (!checkIsValidPayload<TValue>(value)) {
    throw new Error("Invalid payload");
  }
  return value;
};

export interface Job<TValue> {
  /**
   * The name of the queue.
   */
  queue: string;
  /**
   * Push a job to the queue.
   */
  push: (...values: TValue[]) => Promise<void>;
  /**
   * Run a job on a single value.
   */
  run: (value: TValue, ctx: JobContext) => Promise<void>;
  /**
   * Process all job.
   */
  process: () => Promise<void>;
}

export interface JobParams {
  /**
   * The number of messages to prefetch.
   * Basically the number of messages that will be processed in parallel.
   * @default 1
   */
  prefetch?: number;

  /**
   * The timeout for the job in milliseconds.
   * @default 20000 (20 seconds)
   */
  timeout?: number;

  /**
   * Delay applied before each retry. One delay queue is declared per tier, so
   * prefer reusing the shared tiers over inventing new delays.
   * @default DEFAULT_RETRY_LADDER (10s, 1m, 5m)
   */
  retryLadder?: RetryTier[];
}

type JobContext = {
  logger: Logger;
};

// amqplib emits "error" on a channel before closing it, and an EventEmitter
// with no "error" listener throws. Termination observers detach theirs as soon
// as they settle, so keep one attached for the channel's whole life.
function keepChannelErrorHandled(channel: Channel) {
  channel.on("error", () => undefined);
}

// One publisher channel for the whole process: it holds no consumer, so nothing
// about it grows with the number of registered job types.
const publisherLogger = parentLogger.child({
  module: "job",
  shared: true,
  channelType: "publisher",
});
let publisherChannel: Promise<Channel> | null = null;

function getPublisherChannel(): Promise<Channel> {
  if (publisherChannel) {
    return publisherChannel;
  }
  const promise = pRetry(
    async () => {
      publisherLogger.info("Creating publisher channel");
      const channel = await openChannel();
      channel.once("close", () => {
        publisherLogger.info("Publisher channel closed");
        if (publisherChannel === promise) {
          publisherChannel = null;
        }
      });
      publisherLogger.info("Publisher channel created");
      return channel;
    },
    {
      onFailedAttempt: ({ error, attemptNumber, retriesLeft }) => {
        publisherLogger.info(
          { error, attemptNumber, retriesLeft },
          "Publisher channel creation attempt failed",
        );
      },
    },
  );
  publisherChannel = promise;
  promise.catch(() => {
    if (publisherChannel === promise) {
      publisherChannel = null;
    }
  });
  return promise;
}

/**
 * Consumer channels are pooled, ten consumers to a channel.
 *
 * Two broker limits box this in. A channel accepts at most ten consumers
 * (`consumer_max_per_channel` on our broker) and answers the eleventh
 * `basic.consume` with a connection-level 530 that takes every consumer on
 * the connection down with it — so one channel shared by all consumers broke
 * once the worker registered more than ten job types. But the node also caps
 * open channels across every connection (500 on ours), and a channel per
 * consumer (#2519) reached that ceiling once enough processes were up. Ten
 * consumers per channel keeps both limits at a distance.
 */
const MAX_CONSUMERS_PER_CHANNEL = 10;

type PooledConsumerChannel = {
  channel: Promise<Channel>;
  /**
   * Slots handed out, counted synchronously at acquire time — before the
   * channel even exists — so concurrent acquires can never oversubscribe it.
   */
  consumers: number;
  /** Serializes prefetch + consume pairs, see ConsumerChannelSlot.runSetup. */
  setupChain: Promise<unknown>;
};

const consumerChannelPool = new Set<PooledConsumerChannel>();

type ConsumerChannelSlot = {
  channel: Promise<Channel>;
  /**
   * `channel.prefetch` applies to the *next* consumer started on the channel,
   * so two jobs setting up concurrently on a shared channel could land one
   * job's prefetch on the other's consumer. Setup runs through a per-channel
   * chain to keep each prefetch + consume pair whole.
   */
  runSetup: <T>(fn: () => Promise<T>) => Promise<T>;
  /**
   * Takes the channel out of the pool without waiting for its "close" event.
   * amqplib decodes a whole burst of frames in one turn, so a channel can be
   * dead before anyone gets to observe it: the close arrives while
   * `createChannel` is still resolving through the microtask queue, and the
   * listener below then attaches to an emitter that has already fired. Nothing
   * would ever evict such an entry, and first-fit would keep handing it out.
   */
  discard: () => void;
  release: () => void;
};

function acquireConsumerChannelSlot(): ConsumerChannelSlot {
  const entry =
    consumerChannelPool
      .values()
      .find((candidate) => candidate.consumers < MAX_CONSUMERS_PER_CHANNEL) ??
    createPooledConsumerChannel();
  entry.consumers += 1;
  return {
    channel: entry.channel,
    runSetup: (fn) => {
      // `fn` runs whether or not the previous setup failed — one job's broken
      // setup must not wedge the other consumers of the channel.
      const run = entry.setupChain.then(fn, fn);
      entry.setupChain = run.then(
        () => undefined,
        () => undefined,
      );
      return run;
    },
    discard: () => {
      consumerChannelPool.delete(entry);
    },
    release: () => {
      entry.consumers -= 1;
    },
  };
}

function createPooledConsumerChannel(): PooledConsumerChannel {
  const entry: PooledConsumerChannel = {
    channel: openChannel(),
    consumers: 0,
    setupChain: Promise.resolve(),
  };
  consumerChannelPool.add(entry);
  // Evicted as soon as the channel dies (or fails to open) so it never hands
  // out another slot; the consume loops holding its slots observe the same
  // termination and retry into a fresh entry.
  const evict = () => {
    consumerChannelPool.delete(entry);
  };
  entry.channel.then((channel) => channel.once("close", evict), evict);
  return entry;
}

async function openChannel(): Promise<Channel> {
  const connection = await connect();
  const channel = await connection.createChannel();
  keepChannelErrorHandled(channel);
  // Both channels this opens are shared by every job in the process: the
  // consumers of a pooled channel each wait on its termination with their own
  // listener pair, and push() attaches a "drain" listener to the publisher
  // channel whenever a send is blocked.
  channel.setMaxListeners(0);
  return channel;
}

/**
 * Declares the queues a consumer reads from and retries through, on a channel
 * of its own.
 *
 * A declaration that disagrees with an existing queue is answered with a
 * channel-level 406, which would take down the nine unrelated consumers
 * sharing a pooled channel — and take them down again on every retry. Queues
 * are broker-wide, so declaring them here satisfies both the consumer and the
 * retries it publishes from its own channel.
 */
async function assertConsumerQueues(
  queue: string,
  retryLadder: RetryTier[],
): Promise<void> {
  const channel = await openChannel();
  try {
    await Promise.all([
      channel.assertQueue(queue, { durable: true }),
      ...retryLadder.map((tier) =>
        channel.assertQueue(
          getRetryQueueName(queue, tier),
          getRetryQueueOptions(queue, tier),
        ),
      ),
    ]);
  } finally {
    try {
      await channel.close();
    } catch {
      // Already gone, which is how a failed declaration ends: the broker
      // closes the channel it faulted on.
    }
  }
}

// The consumer must not outlive its loop iteration: left behind, it would
// keep consuming next to its replacement and hold a consumer slot the pool no
// longer counts, eventually pushing the shared channel past the broker's
// ten-consumer cap. Closing the channel would do it, but the channel now
// belongs to other consumers too.
async function cancelConsumer(
  channel: Channel,
  consumerTag: string,
): Promise<void> {
  try {
    await channel.cancel(consumerTag);
  } catch {
    // Channel already closed, which is the usual way out of the consume loop:
    // the broker or the connection got there first, and closing cancelled the
    // consumer with it.
  }
}

// Track which queues have been asserted on each channel so we only pay the
// round-trip once. WeakMap keys on the channel itself, so a reconnect with a
// new channel naturally re-asserts.
const assertedQueues = new WeakMap<Channel, Map<string, Promise<void>>>();

function ensureQueueAsserted(channel: Channel, queue: string): Promise<void> {
  let queues = assertedQueues.get(channel);
  if (!queues) {
    queues = new Map();
    assertedQueues.set(channel, queues);
  }
  const existing = queues.get(queue);
  if (existing) {
    return existing;
  }
  const promise = channel
    .assertQueue(queue, { durable: true })
    .then(() => undefined);
  queues.set(queue, promise);
  promise.catch(() => {
    queues!.delete(queue);
  });
  return promise;
}

/**
 * Observes a channel's terminal state: `observed` resolves when the channel
 * closes and rejects when it errors.
 *
 * `dispose` matters now that channels are shared and outlive an iteration:
 * a promise reaction cannot be detached once attached, so a `Promise.race`
 * against a channel-lifetime promise would leave one behind on every fault
 * cycle. Each iteration observes on its own and takes its listeners back.
 */
function observeChannelTermination(channel: Channel): {
  observed: Promise<void>;
  dispose: () => void;
} {
  let dispose!: () => void;
  const observed = new Promise<void>((resolve, reject) => {
    const onClose = () => {
      channel.off("error", onError);
      resolve();
    };
    const onError = (error: unknown) => {
      channel.off("close", onClose);
      reject(error);
    };
    channel.once("close", onClose);
    channel.once("error", onError);
    dispose = () => {
      channel.off("close", onClose);
      channel.off("error", onError);
    };
  });
  return { observed, dispose };
}

export const createJob = <TValue extends string | number>(
  queue: string,
  consumer: {
    perform: (value: TValue, ctx: JobContext) => void | Promise<void>;
    complete?: (value: TValue, ctx: JobContext) => void | Promise<void>;
    error?: (
      value: TValue,
      error: unknown,
      ctx: JobContext,
    ) => void | Promise<void>;
  },
  {
    prefetch = 1,
    timeout = 20_000,
    retryLadder = DEFAULT_RETRY_LADDER,
  }: JobParams = {},
): Job<TValue> => {
  queue = config.get("amqp.queuePrefix") + queue;
  const logger = parentLogger.child({ module: "job", queue });
  return {
    queue,
    async push(...values) {
      const channel = await getPublisherChannel();
      await ensureQueueAsserted(channel, queue);
      const valuesSet = new Set(values);
      const sendOne = (value: TValue) => {
        return channel.sendToQueue(
          queue,
          serializeMessage({ args: [value], attempts: 0 }),
          { persistent: true },
        );
      };
      return new Promise((resolve) => {
        const sendAll = () => {
          for (const value of valuesSet) {
            const keepSending = sendOne(value);
            valuesSet.delete(value);
            if (!keepSending) {
              channel.once("drain", sendAll);
              return;
            }
          }
          resolve();
        };
        sendAll();
      });
    },
    async run(id: TValue, ctx: JobContext) {
      await Sentry.startSpan(
        {
          name: "job.run",
          op: "topic.process",
          attributes: {
            "job.queue": queue,
            "job.id": String(id),
            "job.timeout_ms": timeout,
          },
        },
        () =>
          redisLock.acquire(
            [queue, id],
            async () => {
              await consumer.perform(id, ctx);
              await consumer.complete?.(id, ctx);
            },
            { timeout },
          ),
      );
    },
    process() {
      return runForever(
        async (): Promise<void> => {
          logger.info("Initialize consuming");

          // Declaring the queues before taking a slot surfaces a bad
          // declaration at startup rather than when a job first fails, and
          // keeps the fault off the shared channel.
          await assertConsumerQueues(queue, retryLadder);

          const slot = acquireConsumerChannelSlot();

          try {
            const channel = await slot.channel;
            // Observed before the first operation on the channel: a channel
            // that died on the way here has no "close" left to emit, and the
            // prefetch below then throws instead of the loop waiting forever
            // for a termination that already happened.
            const termination = observeChannelTermination(channel);

            try {
              // Lets the consume callback signal a fatal error to the outer
              // loop. The consumer is cancelled on the way out, so it stops
              // with the iteration and `runForever` re-enters on a fresh slot.
              let signalConsumerFault!: (error: unknown) => void;
              const consumerFault = new Promise<never>((_, reject) => {
                signalConsumerFault = reject;
              });
              // Prevent an unhandled rejection if the channel terminates first.
              consumerFault.catch(() => undefined);

              const { consumerTag } = await slot.runSetup(async () => {
                await channel.prefetch(prefetch);
                logger.info("Consuming queue");
                return channel.consume(queue, async (msg) => {
                  if (!msg) {
                    // The broker cancelled the consumer — its queue was
                    // deleted or moved. Nothing will be delivered here again,
                    // so fault out and let the loop re-declare and re-register.
                    signalConsumerFault(
                      new Error("Consumer cancelled by the broker"),
                    );
                    return;
                  }

                  try {
                    let payload: Payload<TValue>;

                    try {
                      payload = parseMessage<TValue>(msg.content);
                    } catch (error) {
                      channel.ack(msg);
                      logger.error({ error }, "Invalid payload");
                      return;
                    }

                    const id = payload.args[0];
                    const consumeLogger = logger.child({ id });
                    const ctx = { logger: consumeLogger };
                    try {
                      await this.run(id, ctx);
                      channel.ack(msg);
                    } catch (error) {
                      const tier = getRetryTier(retryLadder, payload.attempts);

                      if (checkIsRetryable(error) && tier) {
                        consumeLogger.info(
                          {
                            error,
                            attempts: payload.attempts,
                            delay: tier.delay,
                          },
                          "Retrying job after backoff",
                        );

                        // Published to the delay queue rather than back to the
                        // job queue: it waits there for the tier's TTL, then
                        // RabbitMQ dead-letters it onto the job queue.
                        channel.sendToQueue(
                          getRetryQueueName(queue, tier),
                          serializeMessage({
                            args: payload.args,
                            attempts: payload.attempts + 1,
                          }),
                          { persistent: true },
                        );

                        channel.ack(msg);
                        return;
                      }

                      channel.ack(msg);
                      consumeLogger.error(
                        { error },
                        "Error while processing job",
                      );
                      await pRetry(() =>
                        consumer.error?.(payload.args[0], error, ctx),
                      );
                    }
                  } catch (error) {
                    logger.info({ error }, "Error when processing message");
                    signalConsumerFault(error);
                  }
                });
              });

              try {
                await Promise.race([termination.observed, consumerFault]);
              } finally {
                await cancelConsumer(channel, consumerTag);
              }
            } finally {
              termination.dispose();
            }
          } catch (error) {
            if (error instanceof IllegalOperationError) {
              slot.discard();
            }
            throw error;
          } finally {
            slot.release();
          }
        },
        {
          onError: (error) => {
            logger.error({ error }, "Error while trying to consume job");
          },
        },
      );
    },
  };
};

async function runForever(
  fn: () => Promise<void>,
  options: { onError: (error: unknown) => void },
): Promise<void> {
  const { onError } = options;
  for (;;) {
    try {
      await pRetry(fn);
    } catch (error) {
      onError(error);
    }
  }
}
