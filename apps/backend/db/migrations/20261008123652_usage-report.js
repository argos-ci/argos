/**
 * When the owners were last sent the monthly usage report, so each monthly
 * anniversary of the subscription sends it once.
 *
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.schema.alterTable("accounts", (table) => {
    table.dateTime("lastUsageReportAt");
  });
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.schema.alterTable("accounts", (table) => {
    table.dropColumn("lastUsageReportAt");
  });
};
