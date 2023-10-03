/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async (knex) => {
  await knex.schema.alterTable("accounts", (table) => {
    table.dropIndex(["slug"]);
    table.unique(["slug"]);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = async (knex) => {
  await knex.schema.alterTable("accounts", (table) => {
    table.index(["slug"]);
    table.dropUnique(["slug"]);
  });
};
