/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async (knex) => {
  await knex.schema.dropTable("github_installation_accounts");
};

export const down = async () => {
  throw new Error("There is no way to go back from hell 😈");
};
