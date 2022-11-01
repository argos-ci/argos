import amqp from "amqplib";
import { callbackify } from "node:util";

import config from "@argos-ci/config";

let connectPromise: ReturnType<typeof amqp.connect> | null = null;
async function connect() {
  if (!connectPromise) {
    connectPromise = amqp.connect(config.get("amqp.url"));
  }

  return connectPromise;
}

let channel: amqp.Channel;
export async function getAmqpChannel() {
  if (!channel) {
    const connection = await connect();
    channel = await connection.createChannel();
  }

  return channel;
}

export async function quitAmqp() {
  if (!connectPromise) return;
  const connection = await connectPromise;
  connectPromise = null;
  await connection.close();
}

process.on("SIGTERM", () => {
  callbackify(quitAmqp)((err) => {
    if (err) throw err;
  });
});
