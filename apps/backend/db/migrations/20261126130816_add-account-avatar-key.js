/**
 * @param { import("knex").Knex } knex
 */
export async function up(knex) {
  await knex.schema.alterTable("accounts", (table) => {
    table.text("avatarKey");
  });
}

/**
 * @param { import("knex").Knex } knex
 */
export async function down(knex) {
  await knex.schema.alterTable("accounts", (table) => {
    table.dropColumn("avatarKey");
  });
}
