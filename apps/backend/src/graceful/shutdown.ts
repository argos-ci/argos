import * as Sentry from "@sentry/node";

/**
 * Handle graceful shutdown of the server.
 *
 * The implementation is based on the lifecycle documented by Cloud Run:
 * https://cloud.google.com/run/docs/container-contract#instance-shutdown
 */
export function setupGracefulShutdown() {
  process.on("SIGTERM", () => {
    (async () => {
      await Sentry.flush();
    })()
      .catch((error) => {
        console.error("Error while running tasks before shutdown");
        console.error(error);
        process.exit(1);
      })
      .finally(() => {
        process.exit(0);
      });
  });
}
