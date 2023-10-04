/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async (knex) => {
  await knex.schema.alterTable("projects", (table) => {
    table.dropColumn("slug");
  });
};

export const down = async () => {
  throw new Error("There is no way to go back from hell 😈");
};
