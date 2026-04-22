/**
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.schema.alterTable("deployment_aliases", (table) => {
    table.string("type");
  });

  await knex("deployment_aliases").update({
    type: "domain",
  });

  await knex.schema.alterTable("deployment_aliases", (table) => {
    table.string("type").notNullable().alter();
  });
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.schema.alterTable("deployment_aliases", (table) => {
    table.dropColumn("type");
  });
};
