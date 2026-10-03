/**
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.schema.alterTable("teams", (table) => {
    table.boolean("staticIpEnabled").notNullable().defaultTo(false);
  });
  await knex.schema.alterTable("plans", (table) => {
    table.boolean("staticIpIncluded").notNullable().defaultTo(false);
  });
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.schema.alterTable("plans", (table) => {
    table.dropColumn("staticIpIncluded");
  });
  await knex.schema.alterTable("teams", (table) => {
    table.dropColumn("staticIpEnabled");
  });
};
