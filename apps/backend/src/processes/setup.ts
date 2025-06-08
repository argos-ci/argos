import { setupGracefulShutdown } from "@/graceful/shutdown.js";
import { setup as setupSentry } from "@/sentry/index.js";

setupSentry();
setupGracefulShutdown();
