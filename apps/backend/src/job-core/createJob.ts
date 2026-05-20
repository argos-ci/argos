import * as Sentry from "@sentry/node";
import type { Channel } from "amqplib";
import pRetry from "p-retry";

import config from "@/config";
import parentLogger, { type Logger } from "@/logger";
import { checkIsRetryable } from "@/util/error";
import { redisLock } from "@/util/redis";
import { getRedisClient } from "@/util/redis/client";

import { connect } from "./amqp";

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
   * Coalesce concurrent pushes for the same value into a single in-flight
   * message. The value itself is the dedupe key.
   *
   * How it works: at push time we take a Redis claim keyed by the value
   * (`SET NX PX`). If the claim is taken, we enqueue one AMQP message.
   * If the claim is held by an active runner, we set a `rerun` flag and
   * enqueue nothing — no second message is created. The worker holding
   * the claim runs `perform` in a loop: at the end of each pass, a Lua
   * script atomically checks the rerun flag, refreshing the claim TTL +
   * continuing if set, or releasing the claim if not. This is what
   * captures late-arriving work without piling messages on the per-value
   * lock.
   *
   * Requirement for `perform`: read the "latest" state from a source of
   * truth (DB row, Redis key, …) instead of trusting the value to encode
   * the work — the value is now a key into the work, not the work itself.
   *
   * `ttl` (milliseconds) is the lifetime of the Redis claim. It must
   * outlive worst-case queue lag + processing. Defaults to
   * `max(timeout × 2, 1h)`.
   *
   * @default false
   */
  dedupe?: boolean | { ttl?: number };
}

type JobContext = {
  logger: Logger;
};

// Shared AMQP channels, one per direction, shared across every createJob
// instance in the process. Keeping channels in singletons keeps the per-
// connection channel count constant regardless of how many job types we
// register, which is what stops us tripping RabbitMQ's channel_max limit.
type ChannelDirection = "publisher" | "consumer";
const sharedChannels = new Map<ChannelDirection, Promise<Channel>>();
const sharedChannelLogger = parentLogger.child({ module: "job", shared: true });

function getSharedChannel(direction: ChannelDirection): Promise<Channel> {
  const existing = sharedChannels.get(direction);
  if (existing) {
    return existing;
  }
  const channelLogger = sharedChannelLogger.child({ channelType: direction });
  const promise = pRetry(
    async () => {
      channelLogger.info("Creating shared channel");
      const connection = await connect();
      const channel = await connection.createChannel();
      // Allow many subscribers (one per job type) without triggering Node's
      // MaxListenersExceededWarning.
      channel.setMaxListeners(0);
      channel.once("close", () => {
        channelLogger.info("Shared channel closed");
        if (sharedChannels.get(direction) === promise) {
          sharedChannels.delete(direction);
        }
      });
      channelLogger.info("Shared channel created");
      return channel;
    },
    {
      onFailedAttempt: ({ error, attemptNumber, retriesLeft }) => {
        channelLogger.info(
          { error, attemptNumber, retriesLeft },
          "Shared channel creation attempt failed",
        );
      },
    },
  );
  sharedChannels.set(direction, promise);
  promise.catch(() => {
    if (sharedChannels.get(direction) === promise) {
      sharedChannels.delete(direction);
    }
  });
  return promise;
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

// channel.prefetch with global=false applies to the *next* consumer started
// on the channel. With a shared consumer channel we have to serialize the
// prefetch + consume pair per job, otherwise concurrent setup from different
// jobs can interleave and one job's prefetch ends up applied to another
// job's consumer.
const consumerSetupChain = new WeakMap<Channel, Promise<unknown>>();

function runConsumerSetup<T>(
  channel: Channel,
  fn: () => Promise<T>,
): Promise<T> {
  const previous = consumerSetupChain.get(channel) ?? Promise.resolve();
  const next = previous.then(fn, fn);
  consumerSetupChain.set(
    channel,
    next.catch(() => undefined),
  );
  return next;
}

// Atomically decides whether the dedupe runner should loop again or
// release the claim. If a "rerun" flag was set by a bailed push during
// the run, clear it, refresh the claim TTL, and return "continue".
// Otherwise release the claim and return "done".
//
// KEYS[1] = claim key, KEYS[2] = rerun key
// ARGV[1] = TTL (ms) to apply on "continue"
const DEDUPE_RELEASE_OR_CONTINUE_SCRIPT = `
local rerun = redis.call("GET", KEYS[2])
if rerun then
  redis.call("DEL", KEYS[2])
  redis.call("PEXPIRE", KEYS[1], ARGV[1])
  return "continue"
end
redis.call("DEL", KEYS[1])
return "done"
`;

// One observer per shared channel exposes its terminal state as a promise
// instead of each createJob attaching its own close/error listeners.
const channelTerminations = new WeakMap<Channel, Promise<void>>();

function observeChannelTermination(channel: Channel): Promise<void> {
  const existing = channelTerminations.get(channel);
  if (existing) {
    return existing;
  }
  const promise = new Promise<void>((resolve, reject) => {
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
  channelTerminations.set(channel, promise);
  return promise;
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
  { prefetch = 1, timeout = 20_000, dedupe }: JobParams = {},
): Job<TValue> => {
  queue = config.get("amqp.queuePrefix") + queue;
  const logger = parentLogger.child({ module: "job", queue });

  const dedupeEnabled = Boolean(dedupe);
  // Claim TTL must outlive queue lag + worst-case processing. We default to
  // 1h or twice the job timeout, whichever is larger.
  const dedupeTtlMs =
    dedupeEnabled && typeof dedupe === "object" && dedupe.ttl !== undefined
      ? dedupe.ttl
      : Math.max(timeout * 2, 3_600_000);
  const dedupeClaimKey = (value: TValue) => `job-dedupe.${queue}.${value}`;
  const dedupeRerunKey = (value: TValue) =>
    `job-dedupe-rerun.${queue}.${value}`;

  return {
    queue,
    async push(...values) {
      const channel = await getSharedChannel("publisher");
      await ensureQueueAsserted(channel, queue);
      const valuesSet = new Set(values);

      const claimedValues: TValue[] = [];
      if (dedupeEnabled) {
        const client = await getRedisClient();
        for (const value of [...valuesSet]) {
          const claimed = await client.set(dedupeClaimKey(value), "1", {
            condition: "NX",
            expiration: { type: "PX", value: dedupeTtlMs },
          });
          if (claimed === "OK") {
            claimedValues.push(value);
          } else {
            // A worker is already in flight for this value. Set the
            // rerun flag so it loops once more after its current perform
            // pass, picking up the state change our caller just wrote.
            // We do NOT enqueue a new AMQP message — that's what
            // eliminates the lock-wait pileup that re-enqueueing caused.
            await client.set(dedupeRerunKey(value), "1", {
              expiration: { type: "PX", value: dedupeTtlMs },
            });
            valuesSet.delete(value);
          }
        }
        if (valuesSet.size === 0) {
          return;
        }
      }

      const releaseClaims = async () => {
        if (claimedValues.length === 0) {
          return;
        }
        const client = await getRedisClient();
        await Promise.all(
          claimedValues.map((value) => client.del(dedupeClaimKey(value))),
        );
      };

      const sendOne = (value: TValue) => {
        return channel.sendToQueue(
          queue,
          serializeMessage({ args: [value], attempts: 0 }),
          { persistent: true },
        );
      };
      try {
        await new Promise<void>((resolve, reject) => {
          const sendAll = () => {
            try {
              for (const value of valuesSet) {
                const keepSending = sendOne(value);
                valuesSet.delete(value);
                if (!keepSending) {
                  channel.once("drain", sendAll);
                  return;
                }
              }
              resolve();
            } catch (error) {
              reject(error);
            }
          };
          sendAll();
        });
      } catch (error) {
        // Publish failed — release the dedupe claims we took so the next
        // push can re-enqueue. Without this, the claim would survive its
        // un-published message and silently drop pushes until the TTL.
        await releaseClaims().catch(() => undefined);
        throw error;
      }
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
              ctx.logger.info("Running");
              const performStart = performance.now();
              try {
                if (dedupeEnabled) {
                  // Coalesce loop. Each push that bailed during a
                  // previous iteration set the rerun flag; the Lua
                  // script atomically clears it and refreshes the claim
                  // TTL so we loop once more, capturing late-arriving
                  // work. The claim is held the whole time, so no other
                  // push can enqueue a redundant AMQP message.
                  const client = await getRedisClient();
                  const claim = dedupeClaimKey(id);
                  const rerun = dedupeRerunKey(id);
                  let decision: unknown;
                  do {
                    await client.del(rerun);
                    await consumer.perform(id, ctx);
                    decision = await client.eval(
                      DEDUPE_RELEASE_OR_CONTINUE_SCRIPT,
                      {
                        keys: [claim, rerun],
                        arguments: [String(dedupeTtlMs)],
                      },
                    );
                  } while (decision === "continue");
                } else {
                  await consumer.perform(id, ctx);
                }
              } catch (err) {
                if (dedupeEnabled) {
                  // Release the claim and rerun flag so the next push
                  // can re-trigger work for this value.
                  const client = await getRedisClient();
                  await Promise.all([
                    client.del(dedupeClaimKey(id)).catch(() => undefined),
                    client.del(dedupeRerunKey(id)).catch(() => undefined),
                  ]);
                }
                throw err;
              }
              const performEnd = performance.now();
              const completeStart = performance.now();
              await consumer.complete?.(id, ctx);
              const completeEnd = performance.now();
              const duration = performEnd - performStart;
              const completingDuration = completeEnd - completeStart;
              ctx.logger.info(
                {
                  duration,
                  completingDuration,
                  totalDuration: duration + completingDuration,
                },
                "Done",
              );
            },
            { timeout },
          ),
      );
    },
    process() {
      return runForever(
        async (): Promise<void> => {
          logger.info("Initialize consuming");

          const channel = await getSharedChannel("consumer");
          await ensureQueueAsserted(channel, queue);

          let consumerTag: string | null = null;

          // Lets the consume callback signal a fatal per-consumer error to the
          // outer loop without taking down the shared channel. Racing this
          // against channel termination ensures `runForever` re-registers a
          // fresh consumer for this queue after a cancel.
          let signalConsumerFault!: (error: unknown) => void;
          const consumerFault = new Promise<never>((_, reject) => {
            signalConsumerFault = reject;
          });
          // Prevent an unhandled rejection if the channel terminates first.
          consumerFault.catch(() => undefined);

          const { consumerTag: tag } = await runConsumerSetup(
            channel,
            async () => {
              await channel.prefetch(prefetch);
              logger.info("Consuming queue");
              return channel.consume(queue, async (msg) => {
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
                    if (checkIsRetryable(error) && payload.attempts < 2) {
                      consumeLogger.info(
                        { error },
                        "Error while processing job",
                      );

                      channel.sendToQueue(
                        queue,
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
                  if (consumerTag) {
                    try {
                      await channel.cancel(consumerTag);
                    } catch (cancelError) {
                      logger.info(
                        { error: cancelError },
                        "Error while trying to cancel consumer following error",
                      );
                    }
                  }
                  signalConsumerFault(error);
                }
              });
            },
          );
          consumerTag = tag;

          // Resolves on channel close, rejects on channel error or on a
          // per-consumer fault signalled from the consume callback. Either
          // way pRetry / runForever re-enters and re-registers the consumer.
          await Promise.race([
            observeChannelTermination(channel),
            consumerFault,
          ]);
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
