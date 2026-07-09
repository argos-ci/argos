/**
 * @param { import("knex").Knex } knex
 */
export async function up(knex) {
  // GitHub installation access tokens have grown beyond 255 characters, which
  // overflowed the default varchar(255) column. Widen it to text.
  await knex.schema.alterTable("github_installations", (table) => {
    table.text("githubToken").alter();
  });
}

/**
 * @param { import("knex").Knex } knex
 */
export async function down(knex) {
  await knex.schema.alterTable("github_installations", (table) => {
    table.string("githubToken").alter();
  });
}
