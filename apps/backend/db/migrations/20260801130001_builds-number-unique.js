const INDEX_NAME = "builds_projectid_number_unique";

/**
 * Make a duplicate build number impossible.
 *
 * The counter added by the previous migration removes the race that produced
 * duplicates, but nothing in the schema forbade them — a future regression
 * would corrupt data silently again. `GET /projects/{owner}/{project}/builds/
 * {buildNumber}` resolves a build by number with `.first()`, so a duplicate
 * made the lookup pick non-deterministically between two builds.
 *
 * Created concurrently: `builds` is large in production and a plain
 * `CREATE UNIQUE INDEX` would lock out writes for the duration.
 *
 * The drop before the create is deliberate. A failed `CREATE INDEX
 * CONCURRENTLY` leaves an INVALID index behind; dropping first means a retry
 * rebuilds it instead of finding the broken one and skipping. If the create
 * fails because duplicates exist in the target database, resolve them (renumber
 * or delete) and run the migration again.
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async (knex) => {
  await knex.raw(`DROP INDEX IF EXISTS ${INDEX_NAME}`);
  await knex.raw(
    `CREATE UNIQUE INDEX CONCURRENTLY ${INDEX_NAME}
       ON builds ("projectId", number)`,
  );
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = async (knex) => {
  await knex.raw(`DROP INDEX IF EXISTS ${INDEX_NAME}`);
};

export const config = { transaction: false };
