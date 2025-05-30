import { setupGracefulShutdown } from "@/graceful/shutdown.js";
import { setup as setupSentry } from "@/sentry/index.js";

// This file is used to set up the backend process environment.
setupSentry();
setupGracefulShutdown();
