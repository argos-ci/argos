/**
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.schema.table("accounts", (table) => {
    table.bigInteger("forcedPlanId").index();
    table.foreign("forcedPlanId").references("plans.id");
  });
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.schema.table("accounts", (table) => {
    table.dropColumn("forcedPlanId");
  });
};
