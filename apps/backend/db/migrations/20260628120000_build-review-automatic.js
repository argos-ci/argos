/**
 * @param { import("knex").Knex } knex
 */
export async function up(knex) {
  await knex.schema.alterTable("build_reviews", (table) => {
    table.boolean("automatic").notNullable().defaultTo(false);
  });
}

/**
 * @param { import("knex").Knex } knex
 */
export async function down(knex) {
  await knex.schema.alterTable("build_reviews", (table) => {
    table.dropColumn("automatic");
  });
}
