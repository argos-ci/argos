import { setupGracefulShutdown } from "@/graceful/shutdown.js";
import { setup as setupSentry } from "@/sentry/index.js";

export const setup = () => {
  setupSentry();
  setupGracefulShutdown();
};
