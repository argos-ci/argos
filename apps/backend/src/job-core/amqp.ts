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
          const handleError = (error: unknown) => {
            logger.info({ error }, "Error event");
          };

          const handleClose = () => {
            logger.info("Connection closed");
            cache.clear();
            setImmediate(() => {
              model.off("close", handleClose);
              model.off("error", handleError);
              connect();
            });
          };

          model.on("error", handleError);
          model.on("close", handleClose);

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
