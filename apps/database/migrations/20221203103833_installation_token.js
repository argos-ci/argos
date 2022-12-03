/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async (knex) => {
  await knex.schema.table("installations", (table) => {
    table.string("githubToken");
    table.dateTime("githubTokenExpiresAt");
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = async (knex) => {
  await knex.schema.table("installations", (table) => {
    table.dropColumn("githubToken");
    table.dropColumn("githubTokenExpiresAt");
  });
};
