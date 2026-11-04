import { readFileSync } from "node:fs";
import { invariant } from "@argos/util/invariant";
import { Signer } from "@aws-sdk/rds-signer";
import { Knex } from "knex";

import type { Config } from ".";
import { resolveFromPackageRoot } from "../util/paths";

/**
 * TLS options that make `pg` check it is talking to the RDS instance itself.
 * Only the us-east-1 certificate authorities ship with the app, from
 * https://truststore.pki.rds.amazonaws.com/us-east-1/us-east-1-bundle.pem.
 */
function getRdsSslOptions(hostname: string) {
  invariant(
    hostname.endsWith(".us-east-1.rds.amazonaws.com"),
    `no RDS certificate authority for Postgres host "${hostname}": config/rds-ca-us-east-1.pem only covers us-east-1 RDS endpoints`,
  );
  return {
    ca: readFileSync(
      resolveFromPackageRoot("config/rds-ca-us-east-1.pem"),
      "utf8",
    ),
    rejectUnauthorized: true,
  };
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
      // An AWS session expires while the process keeps running, and the SDK
      // failure would otherwise surface as a connection error naming neither
      // AWS nor what to do about it.
      throw new Error(`No AWS session. ¨Please run \`aws login\` and retry.`, {
        cause: error,
      });
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
          ? getRdsSslOptions(config.get("pg.connection.host"))
          : false,
    },
  };
}
