import amqp, { type ChannelModel } from "amqplib";
import pRetry from "p-retry";

import config from "@/config";
import parentLogger from "@/logger";

const logger = parentLogger.child({ module: "amqp" });

let connectionPromise: Promise<ChannelModel> | null = null;
let connectionRef: ChannelModel | null = null;
let shouldReconnect = true;

export function connect(): Promise<ChannelModel> {
  if (connectionPromise) {
    return connectionPromise;
  }

  const promise = pRetry(connectOnce, {
    onFailedAttempt: ({ error, attemptNumber, retriesLeft }) => {
      logger.info(
        { error, attemptNumber, retriesLeft },
        "Connection attempt failed",
      );
    },
  });

  connectionPromise = promise;

  // Only `handleClose` clears the promise otherwise, and it never runs when no
  // connection was ever established: a broker outage outliving the retries
  // would leave the rejection cached and every later caller — consumers and
  // publishers alike — would get it back instantly, forever.
  promise.catch(() => {
    if (connectionPromise === promise) {
      connectionPromise = null;
    }
  });

  return promise;
}

async function connectOnce(): Promise<ChannelModel> {
  logger.info("Connecting");

  const connection = await amqp.connect(config.get("amqp.url"));
  connectionRef = connection;

  function handleError(error: unknown) {
    logger.warn({ error }, "AMQP connection error event");
  }

  function handleClose() {
    logger.info("AMQP connection closed");

    connection.off("error", handleError);
    connection.off("close", handleClose);

    if (connectionRef === connection) {
      connectionRef = null;
    }

    connectionPromise = null;

    if (!shouldReconnect) {
      return;
    }

    void connect();
  }

  connection.on("error", handleError);
  connection.on("close", handleClose);

  return connection;
}

export async function quitAmqp() {
  shouldReconnect = false;

  try {
    const connection = connectionRef ?? (await connectionPromise) ?? null;

    connectionPromise = null;
    connectionRef = null;

    if (!connection) {
      return;
    }

    await connection.close();
  } finally {
    shouldReconnect = true;
  }
}
