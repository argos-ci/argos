/**
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.schema.alterTable("plans", async (table) => {
    table.boolean("usageBased");
  });
  await knex("plans").update({ usageBased: false });
  await knex.schema.alterTable("plans", async (table) => {
    table.boolean("usageBased").notNullable().alter();
    table.integer("githubId").nullable().alter();
  });
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.schema.alterTable("plans", async (table) => {
    table.dropColumn("usageBased");
    table.integer("githubId").notNullable().alter();
  });
};
