import { E2E_WORKERS, WORKERS_ENV_VAR } from "./vitest.e2e.workers.mjs";

export const setup = async () => {
  // Imported here rather than at the top of the file: Vitest loads every global
  // setup file before running any of them, and reading the configuration loads
  // `.env`, which must happen after the base global setup defined its
  // environment variables.
  const { setupWorkerDatabases, flushWorkerRedisDatabases, getWorkerEnv } =
    await import("../apps/backend/src/database/testing/workers");

  await setupWorkerDatabases(E2E_WORKERS);
  await flushWorkerRedisDatabases(E2E_WORKERS);

  // Workers inherit this process environment, each one picks the entry matching
  // its own id.
  process.env[WORKERS_ENV_VAR] = JSON.stringify(
    Array.from({ length: E2E_WORKERS }, (_, index) => getWorkerEnv(index + 1)),
  );
};
