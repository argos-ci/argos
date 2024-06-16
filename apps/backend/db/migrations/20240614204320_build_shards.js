/**
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.schema.alterTable("builds", (table) => {
    table.string("ciProvider");
    table.string("argosSdk");
    table.string("runId");
    table.integer("runAttempt");
    table.boolean("partial").defaultTo(false);
  });

  await knex.raw(`UPDATE builds SET partial = false WHERE partial IS NULL`);

  await knex.raw(`
    ALTER TABLE builds ADD CONSTRAINT builds_partial_not_null_constraint CHECK (partial IS NOT NULL) NOT VALID;
  `);

  await knex.raw(`
    ALTER TABLE builds VALIDATE CONSTRAINT builds_partial_not_null_constraint;
  `);

  await knex.raw(`
    ALTER TABLE builds ALTER column partial SET NOT NULL;
  `);

  await knex.raw(`
    ALTER TABLE builds DROP CONSTRAINT builds_partial_not_null_constraint;
  `);

  await knex.schema.createTable("build_shards", (table) => {
    table.bigIncrements("id").primary();
    table.dateTime("createdAt").notNullable();
    table.dateTime("updatedAt").notNullable();
    table.bigInteger("buildId").references("builds.id").notNullable();
    table.integer("index");
  });

  await knex.schema.alterTable("screenshots", (table) => {
    table.bigInteger("buildShardId").references("build_shards.id");
  });
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.schema.alterTable("screenshots", (table) => {
    table.dropColumn("buildShardId");
  });
  await knex.schema.dropTable("build_shards");
  await knex.schema.alterTable("builds", (table) => {
    table.dropColumn("ciProvider");
    table.dropColumn("argosSdk");
    table.dropColumn("runId");
    table.dropColumn("runAttempt");
    table.dropColumn("partial");
  });
};
