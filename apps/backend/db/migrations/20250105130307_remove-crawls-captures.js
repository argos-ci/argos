/**
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.schema.dropTable("captures");
  await knex.schema.dropTable("crawls");
};

export const down = async () => {
  throw new Error("There is no way to go back from hell 😈");
};
