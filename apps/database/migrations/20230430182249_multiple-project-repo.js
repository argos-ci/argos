/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async (knex) => {
  await knex.schema.alterTable("projects", async (table) => {
    table.dropUnique(["githubRepositoryId"]);
    table.index("githubRepositoryId");
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = async (knex) => {
  await knex.schema.alterTable("projects", async (table) => {
    table.dropIndex("githubRepositoryId");
    table.unique(["githubRepositoryId"]);
  });
};
