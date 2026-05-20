import * as Sentry from "@sentry/node";
import type { Channel } from "amqplib";
import pRetry from "p-retry";

import config from "@/config";
import parentLogger, { type Logger } from "@/logger";
import { checkIsRetryable } from "@/util/error";
import { redisLock } from "@/util/redis";
import { getRedisClient } from "@/util/redis/client";

import { connect } from "./amqp";
import {
  createDedupeClient,
  type DedupeClient,
  type DedupeDecision,
} from "./dedupe";

interface Payload<TValue> {
  args: [TValue];
  attempts: number;
  /**
   * Per-message UUID stamped at push time when the job has `dedupe`
   * enabled. The runner uses it as the claim value so the Lua scripts
   * can verify ownership before refreshing or releasing the claim — see
   * DEDUPE_RELEASE_OR_CONTINUE_SCRIPT.
   */
  token?: string;
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
   * How it works:
   * - **Push** generates a UUID token, takes a Redis claim
   *   (`SET NX PX <token>`) keyed by the value, and stamps the token in
   *   the AMQP payload. If the claim is already held, it sets a `rerun`
   *   flag and enqueues nothing — no second message is created.
   * - **Run** wraps `perform` in a Lua-driven loop that atomically
   *   verifies token ownership, checks the rerun flag, and either
   *   refreshes the claim TTL + continues, releases the claim + exits,
   *   or bails out as "lost" when a later push has taken over after a
   *   TTL expiry.
   *
   * Result: at most one AMQP message exists per burst, and late-arriving
   * pushes during a run trigger another `perform` pass without piling
   * messages on the per-value lock.
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

  // Build a dedupe client when enabled. Claim TTL must outlive queue
  // lag + worst-case processing; default to `max(timeout × 2, 1h)`.
  const dedupeClient: DedupeClient<TValue> | null = dedupe
    ? createDedupeClient<TValue>({
        scope: queue,
        ttlMs:
          typeof dedupe === "object" && dedupe.ttl !== undefined
            ? dedupe.ttl
            : Math.max(timeout * 2, 3_600_000),
        getRedisClient,
      })
    : null;

  // Runs perform under the per-value redisLock. When `token` is provided
  // (AMQP-driven invocations with `dedupe` enabled), wraps perform in a
  // coalesce loop that re-runs whenever a bailed push has set the rerun
  // flag. When `token` is undefined (public `run` calls), it's a single
  // perform pass.
  const runWithDedupeToken = async (
    id: TValue,
    ctx: JobContext,
    token: string | undefined,
  ): Promise<void> => {
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
              if (dedupeClient && token !== undefined) {
                let decision: DedupeDecision = "continue";
                while (decision === "continue") {
                  await consumer.perform(id, ctx);
                  decision = await dedupeClient.releaseOrContinue(id, token);
                }
                if (decision === "lost") {
                  // Claim TTL expired and a later push took over. Stop
                  // quietly — the new owner's runner will handle any
                  // pending work.
                  ctx.logger.warn(
                    "Dedupe claim lost mid-run; another worker now owns it",
                  );
                }
              } else {
                await consumer.perform(id, ctx);
              }
            } catch (err) {
              if (dedupeClient && token !== undefined) {
                await dedupeClient
                  .releaseIfOwned(id, token)
                  .catch(() => undefined);
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
  };

  return {
    queue,
    async push(...values) {
      const channel = await getSharedChannel("publisher");
      await ensureQueueAsserted(channel, queue);
      const valuesSet = new Set(values);

      // Tokens stamped on the claim at push time so the runner can
      // verify ownership before refreshing or releasing.
      const claimedTokens = new Map<TValue, string>();
      if (dedupeClient) {
        for (const value of [...valuesSet]) {
          const token = await dedupeClient.tryClaim(value);
          if (token !== undefined) {
            claimedTokens.set(value, token);
          } else {
            // A worker is already in flight for this value. `tryClaim`
            // has set the rerun flag so that worker loops once more
            // after its current perform pass; we do NOT enqueue a new
            // AMQP message — that's what eliminates the lock-wait
            // pileup that re-enqueueing caused.
            valuesSet.delete(value);
          }
        }
        if (valuesSet.size === 0) {
          return;
        }
      }

      const releaseClaims = async () => {
        if (claimedTokens.size === 0 || !dedupeClient) {
          return;
        }
        await Promise.all(
          Array.from(claimedTokens, ([value, token]) =>
            dedupeClient.releaseIfOwned(value, token),
          ),
        );
      };

      const sendOne = (value: TValue) => {
        const payload: Payload<TValue> = { args: [value], attempts: 0 };
        const token = claimedTokens.get(value);
        if (token !== undefined) {
          payload.token = token;
        }
        return channel.sendToQueue(queue, serializeMessage(payload), {
          persistent: true,
        });
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
      // Public entry point — no dedupe token available, so callers get a
      // single perform pass. The coalesce loop only runs when invoked
      // from the AMQP consumer below, which threads the token from the
      // message payload.
      return runWithDedupeToken(id, ctx, undefined);
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
                    await runWithDedupeToken(id, ctx, payload.token);
                    channel.ack(msg);
                  } catch (error) {
                    if (checkIsRetryable(error) && payload.attempts < 2) {
                      consumeLogger.info(
                        { error },
                        "Error while processing job",
                      );

                      const retryPayload: Payload<TValue> = {
                        args: payload.args,
                        attempts: payload.attempts + 1,
                      };
                      if (payload.token !== undefined) {
                        retryPayload.token = payload.token;
                      }
                      channel.sendToQueue(
                        queue,
                        serializeMessage(retryPayload),
                        {
                          persistent: true,
                        },
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
