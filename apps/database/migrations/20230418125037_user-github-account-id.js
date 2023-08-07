/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async (knex) => {
  await knex.schema.alterTable("users", (table) => {
    table.bigInteger("githubUserId").index();
    table.foreign("githubUserId").references("github_users.id");
  });

  await knex.raw(
    `update users set "githubUserId" = github_users.id from github_users where users."githubId" = github_users."githubId"`,
  );
  await knex.raw('ALTER TABLE users ALTER COLUMN "githubUserId" SET NOT NULL');

  await knex.schema.alterTable("users", (table) => {
    table.dropColumn("githubId");
  });
};

export const down = async () => {
  throw new Error("There is no way to go back from hell 😈");
};
