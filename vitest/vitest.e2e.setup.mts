import { WORKERS_ENV_VAR } from "./vitest.e2e.workers.mjs";

// Runs before the test file is imported, and must not import anything reading
// the configuration: the worker environment has to be applied before the
// configuration module is evaluated.

const rawWorkersEnv = process.env[WORKERS_ENV_VAR];

if (!rawWorkersEnv) {
  throw new Error(`Missing ${WORKERS_ENV_VAR}, the global setup did not run`);
}

// Vitest gives each worker an id between 1 and `maxWorkers`.
const workerId = Number(process.env["VITEST_POOL_ID"] ?? "1");
const workersEnv = JSON.parse(rawWorkersEnv) as Record<string, string>[];
const workerEnv = workersEnv[workerId - 1];

if (!workerEnv) {
  throw new Error(`No environment defined for worker ${workerId}`);
}

Object.assign(process.env, workerEnv);
