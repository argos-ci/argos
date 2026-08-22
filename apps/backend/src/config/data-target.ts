/**
 * Guardrails around which data a process is allowed to touch.
 *
 * `ARGOS_TARGET=prod-ro` points a local process at the production database
 * through the read-only `argos_dev_ro` Postgres role (see CONTRIBUTING.md).
 * The Postgres grants are the hard write barrier; everything here is the
 * belt-and-braces layer that keeps the *rest* of the process from writing
 * anywhere production-shaped: jobs must land in local queues, and third-party
 * credentials that write elsewhere (emails, Stripe, git providers) must be
 * absent.
 */

const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

/**
 * The only Postgres role prod-ro may connect as. Every other role — the
 * application's own `argos` among them — can write, and the whole mode is
 * built on the assumption that the database refuses writes on its own.
 */
const PROD_RO_ROLE = "argos_dev_ro";

function getHostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

export function assertSafeDataTarget(input: {
  /** `ARGOS_TARGET`: "local" or "prod-ro". */
  target: string;
  /** `NODE_ENV`: "production", "development" or "test". */
  env: string;
  pgHost: string;
  pgUser: string;
  redisUrl: string;
  amqpUrl: string;
  /**
   * Env-var names of write-capable third-party credentials that differ from
   * their schema default, i.e. that are actually set.
   */
  writeCapableSecrets: string[];
}): void {
  if (input.target !== "prod-ro") {
    // Fail closed: outside production, an AWS-hosted database *is* production
    // data, and reaching it without the prod-ro guardrails armed means a
    // hand-assembled environment — exactly the situation that caused writes to
    // production in the past.
    if (input.env !== "production" && input.pgHost.endsWith(".amazonaws.com")) {
      throw new Error(
        `The database host "${input.pgHost}" is production data, but ARGOS_TARGET is not "prod-ro". ` +
          `Use \`pnpm run dev:prod-ro\` (see CONTRIBUTING.md) or point DATABASE_URL at a local database.`,
      );
    }
    return;
  }

  if (input.env !== "development") {
    throw new Error(
      `ARGOS_TARGET=prod-ro is a local development mode and cannot run with NODE_ENV=${input.env}.`,
    );
  }

  // The read-only grants are what actually makes this mode safe, and they live
  // on one role. Connecting as anything else — most plausibly the application's
  // own role, copied out of a production connection string — would leave every
  // other guardrail here reporting a read-only session that can write.
  if (input.pgUser !== PROD_RO_ROLE) {
    throw new Error(
      `ARGOS_TARGET=prod-ro must connect as the read-only role "${PROD_RO_ROLE}", got "${input.pgUser}". ` +
        `Check the user in DATABASE_URL.`,
    );
  }

  // Jobs enqueued by the web process and session/rate-limit state must stay on
  // this machine: a production queue would have production workers execute
  // whatever a local process enqueues.
  for (const [name, url] of [
    ["REDIS_URL", input.redisUrl],
    ["AMQP_URL", input.amqpUrl],
  ] as const) {
    if (!LOCAL_HOSTNAMES.has(getHostname(url))) {
      throw new Error(
        `ARGOS_TARGET=prod-ro requires ${name} to point at localhost, got "${url}".`,
      );
    }
  }

  if (input.writeCapableSecrets.length > 0) {
    throw new Error(
      `ARGOS_TARGET=prod-ro forbids write-capable third-party credentials, remove: ${input.writeCapableSecrets.join(", ")}. ` +
        `Postgres is read-only in this mode, but these write elsewhere (emails, billing, git providers).`,
    );
  }
}
