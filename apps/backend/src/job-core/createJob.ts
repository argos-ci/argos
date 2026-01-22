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
    () =>
      pRetry(
        async () => {
          logger.info("Connecting");
          const amqp = await connect();
          logger.info("Creating channel");
          const channel = await amqp.createChannel();
          logger.info("Channel created");
          channel.once("close", () => {
            logger.info("Channel closed");
            cache.clear();
          });
          return channel;
        },
        {
          onFailedAttempt: ({ error, attemptNumber, retriesLeft }) => {
            logger.info(
              {
                error,
                attemptNumber,
                retriesLeft,
              },
              "Channel creation attempt failed",
            );
          },
        },
      ),
    { cache },
  );
  return {
    queue,
    async push(...values) {
      const channel = await getChannel();
      await channel.assertQueue(queue, { durable: true });
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
      return new Promise((resolve, reject) => {
        const run = () =>
          pRetry(
            async () => {
              logger.info("Initialize consuming");
              const channel = await getChannel();
              channel.once("close", () => {
                run().then(resolve, reject);
              });
              await channel.prefetch(prefetch);
              await channel.assertQueue(queue, { durable: true });
              logger.info("Consuming queue");
              await channel.consume(queue, async (msg) => {
                if (!msg) {
                  return;
                }

                let payload: Payload<TValue>;

                try {
                  payload = parseMessage<TValue>(msg.content);
                  const consumeLogger = logger.child({ payload });
                  try {
                    await this.run(payload.args[0]);
                  } catch (error) {
                    if (checkIsRetryable(error) && payload.attempts < 2) {
                      consumeLogger.info(
                        { error },
                        "Error while processing job",
                      );
                      channel.ack(msg);
                      channel.sendToQueue(
                        queue,
                        serializeMessage({
                          args: payload.args,
                          attempts: payload.attempts + 1,
                        }),
                        { persistent: true },
                      );
                      return;
                    }

                    channel.ack(msg);
                    consumeLogger.error(
                      { error },
                      "Error while processing job",
                    );
                    await consumer.error?.(payload.args[0], error);
                    return;
                  }
                } catch (error) {
                  channel.ack(msg);
                  logger.error({ error }, "Error while processing job");
                  return;
                }

                channel.ack(msg);
              });
            },
            {
              onFailedAttempt: ({ error, attemptNumber, retriesLeft }) => {
                logger.info(
                  `[job:${queue}]: Failed processing (attempt ${attemptNumber} (${retriesLeft} retries left)): ${error.message}`,
                );
              },
            },
          );

        run().then(resolve, (error) => {
          logger.error({ error }, "Error while trying to process job");
          reject(error);
        });
      });
    },
  };
};
