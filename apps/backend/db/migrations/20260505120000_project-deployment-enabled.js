/**
 * @param { import("knex").Knex } knex
 */
export async function up(knex) {
  await knex.schema.alterTable("projects", (table) => {
    table.boolean("deploymentEnabled").notNullable().defaultTo(true);
  });
}

/**
 * @param { import("knex").Knex } knex
 */
export async function down(knex) {
  await knex.schema.alterTable("projects", (table) => {
    table.dropColumn("deploymentEnabled");
  });
}
