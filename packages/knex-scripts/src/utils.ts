import { execFile } from "node:child_process";
import { access } from "node:fs/promises";
import glob from "fast-glob";
import type { Knex } from "knex";

/**
 * Check if a path exists.
 */
async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get inserts from migrations.
 */
export async function getInsertsFromMigrations(input: {
  migrationsPath: string;
}): Promise<string[]> {
  const hasMigrationPath = await exists(input.migrationsPath);
  if (!hasMigrationPath) {
    return [];
  }
  const migrations = await glob("*.js", { cwd: input.migrationsPath });
  return migrations.map(
    (migration) =>
      `INSERT INTO public.knex_migrations(name, batch, migration_time) VALUES ('${migration}', 1, NOW());`,
  );
}

function getNodeEnv() {
  return process.env["NODE_ENV"] || "development";
}

/**
 * Prevent to run the command in production.
 */
export function preventRunningInProduction() {
  if (getNodeEnv() === "production") {
    throw new Error("This command is not allowed in production.");
  }
}

/**
 * Require the environment to be a specific value.
 */
export function requireEnv(env: string) {
  if (getNodeEnv() !== env) {
    throw new Error(`Only in ${env} please!`);
  }
}

function checkIsPgConnectionConfig(
  connection: unknown,
): connection is Knex.PgConnectionConfig {
  return Boolean(typeof connection === "object" && connection);
}

function assertIsPgConnectionConfig(
  connection: unknown,
): asserts connection is Knex.PgConnectionConfig {
  if (!checkIsPgConnectionConfig(connection)) {
    throw new Error("Connection is not a valid Postgres connection config.");
  }
}

export function getCommandEnv(input: { knexConfig: Knex.Config }) {
  const {
    knexConfig: { connection },
  } = input;

  assertIsPgConnectionConfig(connection);

  if (typeof connection.password === "string") {
    return {
      ...process.env,
      PGPASSWORD: connection.password,
    };
  }

  return process.env;
}

/**
 * Returns a postgres command to run with arguments based on the connection config.
 */
export function getPostgresCommand(
  config: { knexConfig: Knex.Config },
  command: string,
  args: string[] = [],
) {
  const {
    knexConfig: { connection },
  } = config;
  const argsOutput = Array.from(args);

  assertIsPgConnectionConfig(connection);

  if (connection.host) {
    argsOutput.push("--host", `${connection.host}`);
  }

  if (connection.user) {
    argsOutput.push("--username", `${connection.user}`);
  }

  if (connection.password) {
    argsOutput.push("--no-password");
  }

  if (!connection.database) {
    throw new Error("Database is missing in connection config.");
  }

  argsOutput.push(connection.database);

  return { command, args: argsOutput };
}

export function runCommand(input: {
  command: string;
  args: string[];
  env?: NodeJS.ProcessEnv;
}) {
  return new Promise((resolve, reject) => {
    execFile(
      input.command,
      input.args,
      { env: input.env },
      (error, stdout, stderr) => {
        if (error) {
          reject(error);
          return;
        }

        if (stderr) {
          reject(stderr);
          return;
        }

        resolve(stdout);
      },
    );
  });
}
