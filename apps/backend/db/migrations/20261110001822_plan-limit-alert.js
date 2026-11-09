/**
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.schema.alterTable("accounts", (table) => {
    table.integer("lastPlanLimitAlertThreshold");
    table.dateTime("lastPlanLimitAlertAt");
  });
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.schema.alterTable("accounts", (table) => {
    table.dropColumn("lastPlanLimitAlertThreshold");
    table.dropColumn("lastPlanLimitAlertAt");
  });
};
