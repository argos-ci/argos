/**
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.schema.alterTable("users", async (table) => {
    table.string("googleUserId").unique();
    table.unique("email");
    table.unique("gitlabUserId");
  });
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.schema.alterTable("users", async (table) => {
    table.dropColumn("googleUserId");
    table.dropUnique(["email"]);
    table.dropUnique(["gitlabUserId"]);
  });
};
