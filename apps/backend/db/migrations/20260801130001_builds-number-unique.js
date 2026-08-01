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
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async (knex) => {
  await knex.raw(
    `CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS builds_projectid_number_unique
       ON builds ("projectId", number)`,
  );
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = async (knex) => {
  await knex.raw(`DROP INDEX IF EXISTS builds_projectid_number_unique`);
};
