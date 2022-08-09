import { callbackify } from "util";
import amqp from "amqplib";
import config from "@argos-ci/config";

let promise;
async function connect() {
  if (!promise) {
    promise = amqp.connect(config.get("amqp.url"));
  }

  return promise;
}

let channel;
export async function getAmqpChannel() {
  if (!channel) {
    const connection = await connect();
    channel = await connection.createChannel();
  }

  return channel;
}

async function quitAmqp() {
  if (!promise) return;
  const connection = await promise;
  await connection.close();
}

process.on("SIGTERM", () => {
  callbackify(quitAmqp)((err) => {
    if (err) throw err;
  });
});
