/**
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.schema.createTable("test_stats_fingerprints", (table) => {
    table.bigInteger("testId").notNullable().references("tests.id");
    table.string("fingerprint", 80).notNullable();
    table.dateTime("date").notNullable();
    table.primary(["testId", "fingerprint", "date"]);
    table.integer("value").notNullable();
  });
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.schema.dropTable("test_stats_fingerprints");
};
