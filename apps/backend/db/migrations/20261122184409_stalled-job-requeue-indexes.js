/**
 * What `requeueStalled` scans every ten minutes: only the rows no job has
 * picked up yet, a handful among all those kept.
 */
const indexes = [
  ["automation_action_runs", "createdAt"],
  ["build_notifications", "createdAt"],
  ["builds", "finalizedAt"],
  ["deployment_notifications", "createdAt"],
  ["github_pull_requests", "createdAt"],
  ["github_synchronizations", "createdAt"],
  ["notification_workflows", "createdAt"],
  ["origin_pull_requests", "createdAt"],
].map(([table, column]) => ({
  table,
  column,
  name: `${table}_pending_${column.toLowerCase()}_index`,
}));

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async (knex) => {
  for (const { table, column, name } of indexes) {
    await createIndex(
      knex,
      name,
      knex.raw(`ON ?? (??) WHERE "jobStatus" = 'pending'`, [table, column]),
    );
  }
};

/**
 * A concurrent build that fails leaves the index in place, marked invalid,
 * and `IF NOT EXISTS` alone would then report success on an index no query
 * can use. Only an invalid one is dropped, never a working one built ahead of
 * the deploy.
 *
 * @param { import("knex").Knex } knex
 * @param {string} name
 * @param { import("knex").Knex.Raw } definition
 */
async function createIndex(knex, name, definition) {
  const invalid = await knex.raw(
    `SELECT 1
     FROM pg_class c
     JOIN pg_index i ON i.indexrelid = c.oid
     WHERE c.relname = ?
       AND NOT i.indisvalid`,
    [name],
  );
  if (invalid.rows.length > 0) {
    await knex.raw(`DROP INDEX CONCURRENTLY ??`, [name]);
  }
  await knex.raw(`CREATE INDEX CONCURRENTLY IF NOT EXISTS ?? ?`, [
    name,
    definition,
  ]);
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = async (knex) => {
  for (const { name } of indexes) {
    await knex.raw(`DROP INDEX CONCURRENTLY IF EXISTS ??`, [name]);
  }
};

export const config = { transaction: false };
