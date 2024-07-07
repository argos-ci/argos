/**
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.schema.alterTable("builds", async (table) => {
    table.jsonb("metadata");
  });

  await knex.schema.alterTable("build_shards", async (table) => {
    table.jsonb("metadata");
  });

  await knex.schema.alterTable("screenshot_buckets", (table) => {
    table.boolean("valid");
  });

  await knex.raw(
    `UPDATE screenshot_buckets SET valid = true WHERE valid IS NULL`,
  );

  await knex.raw(`
    ALTER TABLE screenshot_buckets ADD CONSTRAINT screenshot_buckets_valid_not_null_constraint CHECK (valid IS NOT NULL) NOT VALID;
  `);

  await knex.raw(`
    ALTER TABLE screenshot_buckets VALIDATE CONSTRAINT screenshot_buckets_valid_not_null_constraint;
  `);

  await knex.raw(`
    ALTER TABLE screenshot_buckets ALTER column valid SET NOT NULL;
  `);

  await knex.raw(`
    ALTER TABLE screenshot_buckets DROP CONSTRAINT screenshot_buckets_valid_not_null_constraint;
  `);
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.schema.alterTable("builds", async (table) => {
    table.dropColumn("metadata");
  });

  await knex.schema.alterTable("build_shards", async (table) => {
    table.dropColumn("metadata");
  });

  await knex.schema.alterTable("screenshot_buckets", async (table) => {
    table.dropColumn("valid");
  });
};

export const config = { transaction: false };
