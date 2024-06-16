/**
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.schema.alterTable("builds", (table) => {
    table.index("runId");
  });

  await knex.schema.alterTable("build_shards", (table) => {
    table.index("buildId");
  });

  await knex.schema.alterTable("screenshots", (table) => {
    table.index("buildShardId");
  });
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.schema.alterTable("builds", (table) => {
    table.dropIndex("runId");
  });

  await knex.schema.alterTable("build_shards", (table) => {
    table.dropIndex("buildId");
  });

  await knex.schema.alterTable("screenshots", (table) => {
    table.dropIndex("buildShardId");
  });
};
