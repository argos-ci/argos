/**
 * @param { import("knex").Knex } knex
 */
export async function up(knex) {
  await knex.schema.alterTable("comments", (table) => {
    table.dateTime("resolvedAt").nullable();
  });
}

/**
 * @param { import("knex").Knex } knex
 */
export async function down(knex) {
  await knex.schema.alterTable("comments", (table) => {
    table.dropColumn("resolvedAt");
  });
}
