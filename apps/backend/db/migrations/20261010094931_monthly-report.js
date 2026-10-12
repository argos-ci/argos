/**
 * The monthly report of the teams on an annual plan: when it was last sent,
 * so each monthly anniversary of the subscription sends it once, and when
 * each owner turned it off, null while they receive it.
 *
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.schema.alterTable("accounts", (table) => {
    table.dateTime("lastMonthlyReportAt");
  });
  await knex.schema.alterTable("team_users", (table) => {
    table.dateTime("monthlyReportOptedOutAt");
  });
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.schema.alterTable("team_users", (table) => {
    table.dropColumn("monthlyReportOptedOutAt");
  });
  await knex.schema.alterTable("accounts", (table) => {
    table.dropColumn("lastMonthlyReportAt");
  });
};
