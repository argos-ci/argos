/**
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.schema.alterTable("builds", async (table) => {
    table.enum("conclusion", ["no-changes", "changes-detected"]);
    table.jsonb("stats");
  });
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.schema.alterTable("builds", async (table) => {
    table.dropColumn("conclusion");
    table.dropColumn("stats");
  });
};
