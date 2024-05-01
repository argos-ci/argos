import amqp from "amqplib";

// import { callbackify } from "node:util";
import config from "@/config/index.js";

let connectPromise: ReturnType<typeof amqp.connect> | null = null;
export async function connect() {
  if (!connectPromise) {
    connectPromise = amqp.connect(config.get("amqp.url"));
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
