/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async (knex) => {
  await knex.schema.alterTable("accounts", (table) => {
    table.bigInteger("githubAccountId").index();
    table.foreign("githubAccountId").references("github_accounts.id");
    table.string("name");
    table.string("slug").index();
  });

  await knex.raw(
    `update accounts set "githubAccountId" = users."githubAccountId", "name" = users.name, "slug" = users.slug from users where accounts."userId" = users."id"`
  );
  await knex.raw(
    `update accounts set "githubAccountId" = teams."githubAccountId", "name" = teams.name, "slug" = teams.slug from teams where accounts."teamId" = teams."id"`
  );

  await knex.raw('ALTER TABLE accounts ALTER COLUMN "slug" SET NOT NULL');

  await knex.schema.alterTable("users", (table) => {
    table.dropColumn("githubAccountId");
    table.dropColumn("name");
    table.dropColumn("slug");
  });

  await knex.schema.alterTable("teams", (table) => {
    table.dropColumn("githubAccountId");
    table.dropColumn("name");
    table.dropColumn("slug");
  });
};

export const down = async () => {
  throw new Error("There is no way to go back from hell 😈");
};
