import * as Sentry from "@sentry/node";
import type { Channel } from "amqplib";

import logger from "@argos-ci/logger";

import { getAmqpChannel } from "./amqp.js";
import { checkIsRetryable } from "./error.js";

interface Payload<TArg> {
  args: [TArg];
  attempts: number;
}

const serializeMessage = <TArg>(payload: Payload<TArg>) =>
  Buffer.from(JSON.stringify(payload));

const checkIsValidPayload = <TArg>(value: any): value is Payload<TArg> => {
  return value && Array.isArray(value.args) && Number.isInteger(value.attempts);
};

const parseMessage = <TArg>(message: Buffer) => {
  const value = JSON.parse(message.toString());
  if (!checkIsValidPayload<TArg>(value)) {
    throw new Error("Invalid payload");
  }
  return value;
};

export interface Job<TArg> {
  queue: string;
  push: (arg: TArg) => Promise<void>;
  process: (options: { channel: Channel }) => Promise<void>;
}

export interface JobParams {
  prefetch?: number;
}

export const createJob = <TArg>(
  queue: string,
  consumer: {
    perform: (arg: TArg) => void | Promise<void>;
    complete: (arg: TArg) => void | Promise<void>;
    error: (arg: TArg) => void | Promise<void>;
  },
  { prefetch = 1 }: JobParams = {}
): Job<TArg> => {
  return {
    queue,
    async push(arg: TArg) {
      const channel = await getAmqpChannel();
      await channel.assertQueue(queue, { durable: true });
      channel.sendToQueue(
        queue,
        serializeMessage({ args: [arg], attempts: 0 }),
        {
          persistent: true,
        }
      );
    },
    async process({ channel }: { channel: Channel }) {
      Sentry.configureScope((scope) => {
        scope.setTag("jobQueue", queue);
      });
      await channel.prefetch(prefetch);
      await channel.assertQueue(queue, { durable: true });
      await channel.consume(queue, async (msg) => {
        if (!msg) return;

        let payload: Payload<TArg>;

        try {
          payload = parseMessage<TArg>(msg.content);
          Sentry.configureScope((scope) => {
            scope.setExtra("jobArgs", payload.args);
          });
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
                { persistent: true }
              );
              return;
            }

            channel.ack(msg);
            logger.error(error);
            await consumer.error(payload.args[0]);
            return;
          }
        } catch (error: any) {
          channel.ack(msg);
          logger.error(error);
          return;
        }

        channel.ack(msg);
      });
    },
  };
};
