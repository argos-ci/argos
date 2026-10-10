/**
 * When the owner turned the monthly report of the team off, from the team
 * settings or the unsubscribe link of the email. Null while they receive it.
 *
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
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
};
