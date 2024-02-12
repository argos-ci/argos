/**
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.schema.alterTable("teams", (table) => {
    table.bigInteger("ssoGithubAccountId").index();
    table.foreign("ssoGithubAccountId").references("github_accounts.id");
  });

  await knex.schema.createTable("github_account_members", (table) => {
    table.bigIncrements("id").primary();

    table.dateTime("createdAt").notNullable();
    table.dateTime("updatedAt").notNullable();

    table.bigInteger("githubAccountId").index().notNullable();
    table.foreign("githubAccountId").references("github_accounts.id");

    table.bigInteger("githubMemberId").index().notNullable();
    table.foreign("githubMemberId").references("github_accounts.id");

    table.unique(["githubAccountId", "githubMemberId"]);
  });

  await knex.schema.alterTable("team_users", (table) => {
    table.unique(["teamId", "userId"]);
  });

  await knex.schema.alterTable("plans", (table) => {
    table.boolean("githubSsoIncluded").notNullable().defaultTo(false);
  });
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.schema.dropTable("github_account_members");
  await knex.schema.alterTable("teams", (table) => {
    table.dropColumn("ssoGithubAccountId");
  });
  await knex.schema.alterTable("team_users", (table) => {
    table.dropUnique(["teamId", "userId"]);
  });
  await knex.schema.alterTable("plans", (table) => {
    table.dropColumn("githubSsoIncluded");
  });
};
