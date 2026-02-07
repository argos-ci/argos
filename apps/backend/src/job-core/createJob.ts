import pMemoize from "p-memoize";
import pRetry from "p-retry";

import parentLogger from "@/logger";
import { checkIsRetryable } from "@/util/error";
import { redisLock } from "@/util/redis";

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
  run: (value: TValue) => Promise<void>;
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
}

export const createJob = <TValue extends string | number>(
  queue: string,
  consumer: {
    perform: (value: TValue) => void | Promise<void>;
    complete?: (value: TValue) => void | Promise<void>;
    error?: (value: TValue, error: unknown) => void | Promise<void>;
  },
  { prefetch = 1, timeout = 20_000 }: JobParams = {},
): Job<TValue> => {
  const logger = parentLogger.child({ module: "job", queue });
  const cache = new Map();
  const getChannel = pMemoize(
    (type: "publisher" | "consumer") => {
      const channelLogger = logger.child({ channelType: type });
      return pRetry(
        async () => {
          channelLogger.info("Connecting");
          const amqp = await connect();
          channelLogger.info("Creating channel");
          const channel = await amqp.createChannel();
          channelLogger.info("Channel created");
          channel.once("close", () => {
            channelLogger.info("Channel closed");
            cache.delete(type);
          });
          channelLogger.info("Asserting queue");
          await channel.assertQueue(queue, { durable: true });
          return channel;
        },
        {
          onFailedAttempt: ({ error, attemptNumber, retriesLeft }) => {
            channelLogger.info(
              {
                error,
                attemptNumber,
                retriesLeft,
              },
              "Channel creation attempt failed",
            );
          },
        },
      );
    },
    {
      cache,
      cacheKey: (args) => {
        const [type] = args;
        return type;
      },
    },
  );
  return {
    queue,
    async push(...values) {
      const channel = await getChannel("publisher");
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
    async run(id: TValue) {
      await redisLock.acquire(
        [queue, id],
        async () => {
          await consumer.perform(id);
          await consumer.complete?.(id);
        },
        { timeout },
      );
    },
    process() {
      return runForever(
        async (): Promise<void> => {
          logger.info("Initialize consuming");

          const channel = await getChannel("consumer");

          let done!: () => void;
          let fail!: (error: unknown) => void;

          const finished = new Promise<void>((resolve, reject) => {
            done = resolve;
            fail = reject;
          });

          const onClose = () => {
            logger.info("Channel closed");
            channel.off("close", onClose);
            channel.off("error", onError);
            done();
          };

          const onError = (error: unknown) => {
            logger.info({ error }, "Channel error");
            channel.off("close", onClose);
            channel.off("error", onError);
            fail(error);
          };

          channel.on("close", onClose);
          channel.on("error", onError);

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

              const consumeLogger = logger.child({ payload });

              try {
                await this.run(payload.args[0]);
                channel.ack(msg);
              } catch (error) {
                if (checkIsRetryable(error) && payload.attempts < 2) {
                  consumeLogger.info({ error }, "Error while processing job");

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
                consumeLogger.error({ error }, "Error while processing job");
                await pRetry(() => consumer.error?.(payload.args[0], error));
              }
            } catch (error) {
              logger.info({ error }, "Error when processing message");

              try {
                await channel.close();
              } catch (closeError) {
                logger.info(
                  { error: closeError },
                  "Error while trying to close channel following error",
                );
              }
            }
          });

          await finished;
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
