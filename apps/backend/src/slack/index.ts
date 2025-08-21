import { boltApp, receiver } from "./app";
import { registerEvents } from "./events";

export function getSlackMiddleware() {
  registerEvents(boltApp);
  return receiver.router;
}
