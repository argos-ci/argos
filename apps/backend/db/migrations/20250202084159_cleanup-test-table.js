/**
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.schema.alterTable("tests", async (table) => {
    table.dropColumn("status");
    table.dropColumn("resolvedDate");
    table.dropColumn("resolvedStabilityScore");
    table.dropColumn("muteUntil");
    table.dropColumn("muted");
  });
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.schema.alterTable("tests", async (table) => {
    table.string("status").notNullable().defaultTo("pending");
    table.dateTime("resolvedDate");
    table.integer("resolvedStabilityScore");
    table.dateTime("muteUntil");
    table.boolean("muted").notNullable().defaultTo(false);
  });
};
