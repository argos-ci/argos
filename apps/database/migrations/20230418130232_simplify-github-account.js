/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async (knex) => {
  // -- users
  await knex.schema.alterTable("users", (table) => {
    table.bigInteger("githubAccountId").index();
    table.foreign("githubAccountId").references("github_accounts.id");
  });

  await knex.raw(
    `update users set "githubAccountId" = github_accounts.id from github_accounts where users."githubUserId" = github_accounts."githubUserId"`
  );
  await knex.raw(
    'ALTER TABLE users ALTER COLUMN "githubAccountId" SET NOT NULL'
  );

  await knex.schema.alterTable("users", (table) => {
    table.dropColumn("githubUserId");
  });
  // --

  // -- github_installation_accounts
  await knex.schema.createTable("github_installation_accounts", (table) => {
    table.bigIncrements("id").primary();
    table.dateTime("createdAt").notNullable();
    table.dateTime("updatedAt").notNullable();
    table.bigInteger("githubInstallationId").notNullable().index();
    table.foreign("githubInstallationId").references("github_installations.id");
    table.bigInteger("githubAccountId").notNullable().index();
    table.foreign("githubAccountId").references("github_accounts.id");
  });

  // move data from github_installation_users to github_installation_accounts
  await knex.raw(
    `INSERT INTO github_installation_accounts (id, "createdAt", "updatedAt", "githubAccountId", "githubInstallationId")
    SELECT github_installation_users.id, github_installation_users."createdAt", github_installation_users."updatedAt", github_accounts.id, github_installation_users."githubInstallationId"
    FROM github_installation_users join github_accounts on github_installation_users."githubUserId" = github_accounts."githubUserId"`
  );

  // update github_installation_accounts autoincrement
  await knex.raw(
    `select setval('"github_installation_accounts_id_seq"', (SELECT MAX(id) FROM github_installation_accounts))`
  );
  //

  // -- github_accounts
  await knex.schema.alterTable("github_accounts", (table) => {
    table.string("name");
    table.string("email");
    table.string("login").unique();
    table.integer("githubId").unique();
    table.enum("type", ["user", "organization"]).index();
  });

  await knex.raw(
    `update github_accounts set "type" = 'user', "name" = github_users.name, "email" = github_users.email, "login" = github_users.login, "githubId" = github_users."githubId" from github_users where github_accounts."githubUserId" = github_users.id`
  );
  await knex.raw(
    `update github_accounts set "type" = 'organization', "name" = github_organizations.name, "login" = github_organizations.login, "githubId" = github_organizations."githubId" from github_organizations where github_accounts."githubOrganizationId" = github_organizations.id`
  );

  await knex.raw(
    'ALTER TABLE github_accounts ALTER COLUMN "login" SET NOT NULL'
  );
  await knex.raw(
    'ALTER TABLE github_accounts ALTER COLUMN "githubId" SET NOT NULL'
  );
  await knex.raw(
    'ALTER TABLE github_accounts ALTER COLUMN "type" SET NOT NULL'
  );

  await knex.schema.alterTable("github_accounts", (table) => {
    table.dropColumn("githubUserId");
    table.dropColumn("githubOrganizationId");
  });
  // --

  await knex.schema.dropTable("github_installation_users");
  await knex.schema.dropTable("github_users");
  await knex.schema.dropTable("github_organizations");
};

export const down = async () => {
  throw new Error("There is no way to go back from hell 😈");
};
