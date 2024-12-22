import { exec } from "node:child_process";
import { access, readFile } from "node:fs/promises";
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

export async function getInsertsFromStructure(
  structurePath: string,
): Promise<string[]> {
  const hasStructurePath = await exists(structurePath);
  if (!hasStructurePath) {
    return [];
  }
  const structure = await readFile(structurePath, "utf-8");
  const regExp =
    /INSERT INTO public\.knex_migrations\(name, batch, migration_time\) VALUES \('.*', 1, NOW\(\)\);/g;

  const inserts = [];

  let match: RegExpExecArray | null;
  while ((match = regExp.exec(structure))) {
    inserts.push(match[0]);
  }

  return inserts;
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

export function getCommand(
  input: { knexConfig: Knex.Config },
  command: string,
) {
  const {
    knexConfig: { connection },
  } = input;
  const args = [command];

  assertIsPgConnectionConfig(connection);

  if (connection.host) {
    args.push(`--host "${connection.host}"`);
  }

  if (connection.user) {
    args.push(`--username "${connection.user}"`);
  }

  if (connection.password) {
    args.push("--no-password");
  }

  if (!connection.database) {
    throw new Error("Database is missing in connection config.");
  }

  args.push(connection.database);

  return args.join(" ");
}

export function runCommand(
  command: string,
  options?: { env?: NodeJS.ProcessEnv; log?: (value: string) => void },
) {
  const log = options?.log || (() => {});
  return new Promise((resolve, reject) => {
    log(`Running command: "${command}"`);
    exec(command, options, (error, stdout, stderr) => {
      if (error) {
        reject(error);
        return;
      }

      if (stderr) {
        reject(stderr);
        return;
      }

      resolve(stdout);
    });
  });
}
