import { invariant } from "@argos/util/invariant";
import * as Sentry from "@sentry/node";
import { memoize } from "lodash-es";

import logger from "@/logger/index.js";

import { connect } from "./amqp.js";
import { checkIsRetryable } from "./error.js";

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
  queue: string;
  push: (...values: TValue[]) => Promise<void>;
  process: () => Promise<void>;
}

export interface JobParams {
  prefetch?: number;
}

export const createJob = <TValue>(
  queue: string,
  consumer: {
    perform: (value: TValue) => void | Promise<void>;
    complete: (value: TValue) => void | Promise<void>;
    error: (value: TValue) => void | Promise<void>;
  },
  { prefetch = 1 }: JobParams = {},
): Job<TValue> => {
  const getChannel = memoize(async () => {
    const amqp = await connect();
    const channel = await amqp.createChannel();
    const reset = () => {
      invariant(getChannel.cache.clear, "No clear method on cache.");
      getChannel.cache.clear();
    };
    channel.once("close", reset);
    return channel;
  });
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
    process() {
      return new Promise((resolve, reject) => {
        const run = async () => {
          const channel = await getChannel();
          channel.once("close", () => {
            run().then(resolve, reject);
          });
          await channel.prefetch(prefetch);
          await channel.assertQueue(queue, { durable: true });
          await channel.consume(queue, async (msg) => {
            if (!msg) {
              return;
            }

            let payload: Payload<TValue>;

            try {
              payload = parseMessage<TValue>(msg.content);
              try {
                await consumer.perform(payload.args[0]);
                await consumer.complete(payload.args[0]);
              } catch (error: any) {
                if (checkIsRetryable(error) && payload.attempts < 2) {
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
                Sentry.withScope((scope) => {
                  scope.setTag("jobQueue", queue);
                  scope.setExtra("jobArgs", payload.args);
                  logger.error(error);
                });
                await consumer.error(payload.args[0]);
                return;
              }
            } catch (error: any) {
              channel.ack(msg);
              Sentry.withScope((scope) => {
                scope.setTag("jobQueue", queue);
                scope.setExtra("jobArgs", payload.args);
                logger.error(error);
              });
              return;
            }

            channel.ack(msg);
          });
        };

        run().then(resolve, reject);
      });
    },
  };
};
