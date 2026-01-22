import amqp from "amqplib";

import config from "@/config";

let connectPromise: ReturnType<typeof amqp.connect> | null = null;
export async function connect() {
  if (!connectPromise) {
    connectPromise = amqp.connect(config.get("amqp.url")).catch((error) => {
      // If there is an error avoid caching the connection
      // to be able to reconnect properly.
      connectPromise = null;
      throw error;
    });
  }

  return connectPromise;
}

export async function quitAmqp() {
  if (!connectPromise) {
    return;
  }
  const connection = await connectPromise;
  connectPromise = null;
  await connection.close();
}
