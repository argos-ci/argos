import * as Sentry from "@sentry/node";
import type { Channel, Options } from "amqplib";
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
      const connection = await connect();
      const channel = await connection.createChannel();
      keepChannelErrorHandled(channel);
      // push() attaches a "drain" listener whenever a send is blocked, and
      // every job in the process publishes through this one channel.
      channel.setMaxListeners(0);
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
 * Consumers get a channel each.
 *
 * A broker caps how many consumers one channel may hold — ours at ten — and
 * answers a breach with a connection-level 530, which takes down every other
 * consumer on the connection with it. Sharing a single consumer channel
 * therefore capped how many job types the worker could register at all, and
 * crossing that cap broke every job rather than the one registered last.
 * Channels are the cheap resource here (`channel_max` is 2047), and one
 * consumer per channel also makes `prefetch` — which applies to the next
 * consumer started on the channel — unambiguous.
 */
async function createConsumerChannel(): Promise<Channel> {
  const connection = await connect();
  const channel = await connection.createChannel();
  keepChannelErrorHandled(channel);
  return channel;
}

async function closeChannel(channel: Channel): Promise<void> {
  try {
    await channel.close();
  } catch {
    // Already closed, which is the usual way out of the consume loop: the
    // broker or the connection got there first.
  }
}

// Track which queues have been asserted on each channel so we only pay the
// round-trip once. WeakMap keys on the channel itself, so a reconnect with a
// new channel naturally re-asserts.
const assertedQueues = new WeakMap<Channel, Map<string, Promise<void>>>();

function ensureQueueAsserted(
  channel: Channel,
  queue: string,
  options: Options.AssertQueue = { durable: true },
): Promise<void> {
  let queues = assertedQueues.get(channel);
  if (!queues) {
    queues = new Map();
    assertedQueues.set(channel, queues);
  }
  const existing = queues.get(queue);
  if (existing) {
    return existing;
  }
  const promise = channel.assertQueue(queue, options).then(() => undefined);
  queues.set(queue, promise);
  promise.catch(() => {
    queues!.delete(queue);
  });
  return promise;
}

// Resolves when the channel closes, rejects when it errors.
function observeChannelTermination(channel: Channel): Promise<void> {
  return new Promise<void>((resolve, reject) => {
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
  });
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

          const channel = await createConsumerChannel();

          try {
            await ensureQueueAsserted(channel, queue);
            // Retries are published from this channel, so the delay queues have
            // to exist here. Asserting them during setup surfaces a bad
            // declaration at startup instead of when a job first fails.
            await Promise.all(
              retryLadder.map((tier) =>
                ensureQueueAsserted(
                  channel,
                  getRetryQueueName(queue, tier),
                  getRetryQueueOptions(queue, tier),
                ),
              ),
            );

            // Lets the consume callback signal a fatal error to the outer loop.
            // The channel goes down with the loop iteration, so the consumer
            // stops with it and `runForever` re-enters on a fresh one.
            let signalConsumerFault!: (error: unknown) => void;
            const consumerFault = new Promise<never>((_, reject) => {
              signalConsumerFault = reject;
            });
            // Prevent an unhandled rejection if the channel terminates first.
            consumerFault.catch(() => undefined);

            await channel.prefetch(prefetch);
            logger.info("Consuming queue");
            await channel.consume(queue, async (msg) => {
              if (!msg) {
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
                  consumeLogger.error({ error }, "Error while processing job");
                  await pRetry(() =>
                    consumer.error?.(payload.args[0], error, ctx),
                  );
                }
              } catch (error) {
                logger.info({ error }, "Error when processing message");
                signalConsumerFault(error);
              }
            });

            await Promise.race([
              observeChannelTermination(channel),
              consumerFault,
            ]);
          } finally {
            await closeChannel(channel);
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
