import { setupGracefulShutdown } from "@/graceful/shutdown";
import { setup as setupSentry } from "@/sentry";

// This file is used to set up the backend process environment.
setupSentry();
setupGracefulShutdown();
