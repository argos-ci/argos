/**
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.schema.alterTable("accounts", (table) => {
    table.enum("lastPlanLimitAlertLevel", ["warning", "rejected"]);
    table.dateTime("lastPlanLimitAlertAt");
  });
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.schema.alterTable("accounts", (table) => {
    table.dropColumn("lastPlanLimitAlertLevel");
    table.dropColumn("lastPlanLimitAlertAt");
  });
};
