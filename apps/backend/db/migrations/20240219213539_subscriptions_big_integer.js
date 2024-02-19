/**
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.schema.alterTable("subscriptions", async (table) => {
    table.bigInteger("accountId").notNullable().alter();
    table.bigInteger("subscriberId").alter();
  });
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.schema.alterTable("subscriptions", async (table) => {
    table.integer("accountId").notNullable().alter();
    table.integer("subscriberId").alter();
  });
};
