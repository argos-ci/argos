import { invariant } from "@argos/util/invariant";
import { Signer } from "@aws-sdk/rds-signer";
import { Knex } from "knex";

import logger from "@/logger";

import type { Config } from ".";

/**
 * Say what a failed RDS IAM signature means, because nothing downstream can.
 *
 * The signer runs inside the pool's connection factory, so its error surfaces
 * on whatever request happened to need a new connection — and the app renders
 * it verbatim on the login screen. The AWS SDK's own wording for an expired
 * session is "Your session has expired. Please reauthenticate.", which on that
 * screen reads as if the *Argos* session had expired, with nothing naming AWS,
 * the database, or the command that fixes it.
 */
export function explainRdsTokenFailure(input: {
  error: unknown;
  target: string;
  user: string;
}): string {
  const cause =
    input.error instanceof Error ? input.error.message : String(input.error);
  const hint =
    input.target === "prod-ro"
      ? "your AWS session has most likely expired — sign in again (`aws login`, or `aws sso login` on an SSO profile) and retry, the pool signs a new token on the next connection so there is nothing to restart"
      : `the process needs AWS credentials allowed to \`rds-db:connect\` as "${input.user}"`;
  return `Could not sign an RDS IAM token to reach the database: ${hint}. (${cause})`;
}

/**
 * The connection factory retries every 200ms until the acquire timeout, so an
 * expired session would otherwise print hundreds of identical lines.
 */
let lastReportedAt = 0;
function reportThrottled(message: string, error: unknown): void {
  const now = Date.now();
  if (now - lastReportedAt < 60_000) {
    return;
  }
  lastReportedAt = now;
  logger.error({ error }, message);
}

/**
 * Resolve the connection password. With `pg.connection.iamAuth` there is no
 * stored password: `pg` calls the function for every new pool connection and
 * gets a freshly signed RDS IAM token (15-minute validity, but only used to
 * open the connection — established connections are unaffected).
 */
function getPassword(config: Config): string | (() => Promise<string>) {
  if (!config.get("pg.connection.iamAuth")) {
    return config.get("pg.connection.password") || "";
  }

  const hostname = config.get("pg.connection.host");
  const region = hostname.match(/\.([a-z0-9-]+)\.rds\.amazonaws\.com$/)?.[1];
  invariant(
    region,
    `cannot derive an AWS region from Postgres host "${hostname}" — PG_IAM_AUTH expects an RDS endpoint`,
  );

  const signer = new Signer({
    hostname,
    region,
    port: config.get("pg.connection.port"),
    username: config.get("pg.connection.user"),
  });
  return async () => {
    try {
      return await signer.getAuthToken();
    } catch (error) {
      const message = explainRdsTokenFailure({
        error,
        target: config.get("target"),
        user: config.get("pg.connection.user"),
      });
      reportThrottled(message, error);
      throw new Error(message, { cause: error });
    }
  };
}

/**
 * Get the Knex configuration from the application configuration.
 */
export function getKnexConfig(config: Config): Knex.Config {
  return {
    client: "postgresql",
    migrations: {
      directory: config.get("pg.migrations.directory"),
    },
    pool: {
      min: config.get("pg.pool.min"),
      max: config.get("pg.pool.max"),
    },
    connection: {
      database: config.get("pg.connection.database"),
      host: config.get("pg.connection.host"),
      user: config.get("pg.connection.user"),
      port: config.get("pg.connection.port"),
      password: getPassword(config),
      timezone: "utc",
      // RDS rejects IAM tokens over plaintext connections.
      ssl:
        config.get("pg.connection.ssl") || config.get("pg.connection.iamAuth")
          ? { rejectUnauthorized: false }
          : false,
    },
  };
}
