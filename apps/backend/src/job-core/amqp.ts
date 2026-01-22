import amqp from "amqplib";
import pMemoize from "p-memoize";
import pRetry from "p-retry";

import config from "@/config";
import parentLogger from "@/logger";

const cache = new Map();

const logger = parentLogger.child({ module: "amqp" });

export const connect = pMemoize(
  () => {
    logger.info("Connecting");
    return pRetry(
      () =>
        amqp.connect(config.get("amqp.url")).then((model) => {
          model.once("error", (error) => {
            logger.error({ error }, "Error event");
          });

          model.once("close", () => {
            logger.info("Connection closed");
            cache.clear();
            setImmediate(() => {
              connect();
            });
          });

          return model;
        }),
      {
        onFailedAttempt: ({ error, attemptNumber, retriesLeft }) => {
          logger.info(
            {
              error,
              attemptNumber,
              retriesLeft,
            },
            "Connection attempt failed",
          );
        },
      },
    );
  },
  { cache },
);

export async function quitAmqp() {
  if (cache.size === 0) {
    return;
  }
  const connection = await connect();
  await connection.close();
}
