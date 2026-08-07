import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { promisify } from "node:util";
import createKnex, { type Knex } from "knex";
import { createClient } from "redis";

import config from "@/config";
import { getKnexConfig } from "@/config/database";
import { resolveFromPackageRoot } from "@/util/paths";

const execFileAsync = promisify(execFile);

/**
 * Maximum number of workers: each one takes a Redis logical database, and Redis
 * exposes 16 of them (0-15) by default.
 */
const MAX_WORKERS = 15;

/**
 * The schema loaded in the worker databases, the same file `db:load` uses.
 */
const STRUCTURE_PATH = resolveFromPackageRoot("db/structure.sql");

/**
 * Both setups below wipe everything they touch, so make sure they can only run
 * against the test infrastructure.
 */
function assertCanSetupWorkers(workerCount: number): void {
  if (config.get("env") !== "test") {
    throw new Error("Test workers can only be set up in test environment");
  }

  if (workerCount < 1 || workerCount > MAX_WORKERS) {
    throw new Error(`Worker count must be between 1 and ${MAX_WORKERS}`);
  }
}

/**
 * Name of the database owned by a test worker.
 */
export function getWorkerDatabaseName(workerId: number): string {
  return `${config.get("pg.connection.database")}_${workerId}`;
}

type WorkerEnv = {
  PG_DATABASE: string;
  REDIS_URL: string;
  AMQP_QUEUE_PREFIX: string;
};

/**
 * Environment variables isolating a test worker from the other ones. They must
 * be applied before any module reads the configuration.
 */
export function getWorkerEnv(workerId: number): WorkerEnv {
  const redisUrl = new URL(config.get("redis.url"));
  // Redis databases are named by index, one per worker. Ids start at 1 so the
  // default database (0) is never used.
  redisUrl.pathname = `/${workerId}`;
  return {
    PG_DATABASE: getWorkerDatabaseName(workerId),
    REDIS_URL: redisUrl.href,
    AMQP_QUEUE_PREFIX: `${config.get("amqp.queuePrefix")}${workerId}:`,
  };
}

function getConnectionConfig(): Knex.PgConnectionConfig {
  return getKnexConfig(config).connection as Knex.PgConnectionConfig;
}

/**
 * Load `db/structure.sql` into a database, the way `db:load` does. It goes
 * through `psql`: the file contains meta-commands the server cannot run.
 */
async function loadStructure(database: string): Promise<void> {
  const connection = getConnectionConfig();
  const args = ["--quiet", "--no-psqlrc", "-v", "ON_ERROR_STOP=1"];

  if (connection.host) {
    args.push("--host", connection.host);
  }

  if (connection.port) {
    args.push("--port", String(connection.port));
  }

  if (connection.user) {
    args.push("--username", connection.user);
  }

  args.push("--file", STRUCTURE_PATH, database);

  const password =
    typeof connection.password === "string" ? connection.password : null;

  await execFileAsync("psql", args, {
    env: password ? { ...process.env, PGPASSWORD: password } : process.env,
  });
}

/**
 * Set up one database per test worker.
 *
 * Integration tests truncate every table between tests, so they can only run in
 * parallel if each worker owns its database. Those databases are built from
 * `db/structure.sql` rather than copied from the `test` database: copying it
 * would fail as soon as anything else is connected to it, which the dev server
 * and the Playwright suite both do.
 *
 * A database is rebuilt only when the schema it holds is outdated — tests
 * truncate it anyway, so an up-to-date one is reused as is.
 */
export async function setupWorkerDatabases(workerCount: number): Promise<void> {
  assertCanSetupWorkers(workerCount);

  const structure = await readFile(STRUCTURE_PATH);
  // Hexadecimal, so it can be inlined in the statement below: utility
  // statements take no bound parameter.
  const structureHash = createHash("sha256").update(structure).digest("hex");

  const knexConfig = getKnexConfig(config);
  const knex = createKnex({
    ...knexConfig,
    // "postgres" is the maintenance database: a database cannot be created from
    // a connection opened on itself.
    connection: { ...getConnectionConfig(), database: "postgres" },
    pool: { min: 0, max: 1 },
  });

  try {
    const outdated: string[] = [];

    for (let workerId = 1; workerId <= workerCount; workerId++) {
      const database = getWorkerDatabaseName(workerId);
      // The hash of the schema a database was built from is stored as its
      // comment.
      const result = await knex.raw<{ rows: { hash: string | null }[] }>(
        "SELECT shobj_description(oid, 'pg_database') AS hash FROM pg_database WHERE datname = ?",
        [database],
      );

      if (result.rows[0]?.hash === structureHash) {
        continue;
      }

      // FORCE closes the connections left by an interrupted run.
      await knex.raw("DROP DATABASE IF EXISTS ?? WITH (FORCE)", [database]);
      await knex.raw("CREATE DATABASE ??", [database]);
      outdated.push(database);
    }

    await Promise.all(outdated.map(loadStructure));

    for (const database of outdated) {
      await knex.raw(`COMMENT ON DATABASE ?? IS '${structureHash}'`, [
        database,
      ]);
    }
  } finally {
    await knex.destroy();
  }
}

/**
 * Flush the Redis database of each test worker, so that a run never sees the
 * keys left by the previous one.
 */
export async function flushWorkerRedisDatabases(
  workerCount: number,
): Promise<void> {
  assertCanSetupWorkers(workerCount);

  await Promise.all(
    Array.from({ length: workerCount }, async (_, index) => {
      const client = createClient({ url: getWorkerEnv(index + 1).REDIS_URL });
      await client.connect();
      try {
        await client.flushDb();
      } finally {
        await client.close();
      }
    }),
  );
}
