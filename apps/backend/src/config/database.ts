import { invariant } from "@argos/util/invariant";
import { Signer } from "@aws-sdk/rds-signer";
import { Knex } from "knex";

import type { Config } from ".";

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
  return () => signer.getAuthToken();
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
