/**
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.schema.table("purchases", (table) => {
    table.dateTime("startDate").defaultTo(knex.fn.now());
    table.dateTime("endDate");
  });
  await knex.schema.alterTable("plans", (table) => {
    table.integer("githubId").notNullable().index().alter();
  });
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.schema.table("purchases", (table) => {
    table.dropColumn("startDate");
    table.dropColumn("endDate");
  });
  await knex.schema.alterTable("plans", (table) => {
    table.dropIndex("githubId");
    table.string("githubId").notNullable().alter();
  });
};
