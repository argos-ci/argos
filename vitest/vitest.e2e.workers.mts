import { availableParallelism } from "node:os";

/**
 * Number of workers running integration tests in parallel.
 *
 * Each worker gets its own database, Redis database and queue namespace, so
 * more workers also means more databases to copy before the run starts.
 */
export const E2E_WORKERS = Math.max(1, Math.min(4, availableParallelism() - 1));

/**
 * Environment variable carrying the environment of every worker, as JSON,
 * from the global setup down to the workers.
 *
 * @see vitest.e2e.global-setup.mts
 * @see vitest.e2e.setup.mts
 */
export const WORKERS_ENV_VAR = "ARGOS_TEST_WORKERS_ENV";
