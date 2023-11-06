/**
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.schema.alterTable("files", async (table) => {
    table.enum("type", ["screenshot", "playwrightTrace"]);
  });

  await knex.schema.alterTable("screenshots", async (table) => {
    table.bigInteger("playwrightTraceFileId");
    table.foreign("playwrightTraceFileId").references("files.id");
  });
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.schema.alterTable("screenshots", async (table) => {
    table.dropColumn("playwrightTraceFileId");
  });

  await knex.schema.alterTable("files", async (table) => {
    table.dropColumn("type");
  });
};
