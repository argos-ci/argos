/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async (knex) => {
  // -- github_installations
  await knex.schema.createTable("github_installations", (table) => {
    table.bigIncrements("id").primary();
    table.dateTime("createdAt").notNullable();
    table.dateTime("updatedAt").notNullable();
    table.integer("githubId").notNullable().unique();
    table.boolean("deleted").notNullable().defaultTo(false);
    table.string("githubToken");
    table.dateTime("githubTokenExpiresAt");
  });

  // move data from installations to github_installations
  await knex.raw(
    `INSERT INTO github_installations (id, "createdAt", "updatedAt", "githubId", deleted, "githubToken", "githubTokenExpiresAt")
    SELECT id, "createdAt", "updatedAt", "githubId", deleted, "githubToken", "githubTokenExpiresAt"
    FROM installations`
  );

  await knex.raw(
    `select setval('"github_installations_id_seq"', (SELECT MAX(id) FROM github_installations))`
  );
  // --

  // -- github_synchronizations
  await knex.schema.createTable("github_synchronizations", (table) => {
    table.bigIncrements("id").primary();
    table.dateTime("createdAt").notNullable();
    table.dateTime("updatedAt").notNullable();
    table.specificType("jobStatus", "job_status").notNullable().index();
    table.bigInteger("githubInstallationId").notNullable().index();
    table.foreign("githubInstallationId").references("github_installations.id");
  });

  // move data from synchronizations to github_synchronizations
  await knex.raw(
    `INSERT INTO github_synchronizations (id, "createdAt", "updatedAt", "jobStatus", "githubInstallationId")
    SELECT id, "createdAt", "updatedAt", "jobStatus", "installationId"
    FROM synchronizations where "installationId" is not null`
  );

  // update github_synchronizations autoincrement
  await knex.raw(
    `select setval('"github_synchronizations_id_seq"', (SELECT MAX(id) FROM github_synchronizations))`
  );
  //

  // -- github_organizations
  await knex.schema.createTable("github_organizations", (table) => {
    table.bigIncrements("id").primary();
    table.dateTime("createdAt").notNullable();
    table.dateTime("updatedAt").notNullable();
    table.string("name").notNullable();
    table.string("login").notNullable().unique();
    table.integer("githubId").notNullable().unique();
  });

  // move data from organizations to github_organizations
  await knex.raw(
    `INSERT INTO github_organizations (id, "createdAt", "updatedAt", name, login, "githubId")
    SELECT id, "createdAt", "updatedAt", name, login, "githubId"
    FROM organizations`
  );

  // update github_organizations autoincrement
  await knex.raw(
    `select setval('"github_organizations_id_seq"', (SELECT MAX(id) FROM github_organizations))`
  );
  // --

  // -- github_users
  await knex.schema.createTable("github_users", (table) => {
    table.bigIncrements("id").primary();
    table.dateTime("createdAt").notNullable();
    table.dateTime("updatedAt").notNullable();
    table.string("name");
    table.string("email");
    table.string("login").notNullable().unique();
    table.integer("githubId").notNullable().unique();
  });

  // move data from users to github_users
  await knex.raw(
    `INSERT INTO github_users (id, "createdAt", "updatedAt", login, name, email, "githubId")
    SELECT id, "createdAt", "updatedAt", login, name, email, "githubId"
    FROM users`
  );

  // update github_users autoincrement
  await knex.raw(
    `select setval('"github_users_id_seq"', (SELECT MAX(id) FROM github_users))`
  );
  // --

  // -- github_accounts
  await knex.schema.createTable("github_accounts", (table) => {
    table.bigIncrements("id").primary();
    table.dateTime("createdAt").notNullable();
    table.dateTime("updatedAt").notNullable();
    table.bigInteger("githubUserId").index();
    table.foreign("githubUserId").references("github_users.id");
    table.bigInteger("githubOrganizationId").index();
    table.foreign("githubOrganizationId").references("github_organizations.id");
  });

  await knex.raw(
    `ALTER TABLE github_accounts ADD CONSTRAINT github_accounts_only_one_owner CHECK (num_nonnulls("githubUserId", "githubOrganizationId") = 1)`
  );

  // move data from accounts to github_accounts
  await knex.raw(
    `INSERT INTO github_accounts (id, "createdAt", "updatedAt", "githubUserId", "githubOrganizationId")
    SELECT id, "createdAt", "updatedAt", "userId", "organizationId"
    FROM accounts`
  );

  // update github_accounts autoincrement
  await knex.raw(
    `select setval('"github_accounts_id_seq"', (SELECT MAX(id) FROM github_accounts))`
  );
  // --

  // -- github_repositories
  await knex.schema.createTable("github_repositories", (table) => {
    table.bigIncrements("id").primary();
    table.dateTime("createdAt").notNullable();
    table.dateTime("updatedAt").notNullable();
    table.string("name").notNullable().index();
    table.boolean("private").notNullable();
    table.string("defaultBranch").notNullable();
    table.integer("githubId").notNullable().unique();
    table.bigInteger("githubAccountId").index();
    table.foreign("githubAccountId").references("github_accounts.id");
  });

  // move data from repositories to github_repositories
  await knex.raw(
    `INSERT INTO github_repositories (id, "createdAt", "updatedAt", name, private, "defaultBranch", "githubId", "githubAccountId")
    select repositories.id, repositories."createdAt", repositories."updatedAt", repositories.name, repositories.private, repositories."defaultBranch", repositories."githubId", accounts.id as "accountId" from repositories join accounts on accounts."userId" = repositories."userId" or accounts."organizationId" = repositories."organizationId"`
  );

  // update github_repositories autoincrement
  await knex.raw(
    `select setval('"github_repositories_id_seq"', (SELECT MAX(id) FROM github_repositories))`
  );
  // --

  // -- github_repository_installations
  await knex.schema.createTable("github_repository_installations", (table) => {
    table.bigIncrements("id").primary();
    table.dateTime("createdAt").notNullable();
    table.dateTime("updatedAt").notNullable();
    table.bigInteger("githubRepositoryId").notNullable().index();
    table.foreign("githubRepositoryId").references("github_repositories.id");
    table.bigInteger("githubInstallationId").notNullable().index();
    table.foreign("githubInstallationId").references("github_installations.id");
  });

  // move data from installation_repository_rights to github_repository_installations
  await knex.raw(
    `INSERT INTO github_repository_installations (id, "createdAt", "updatedAt", "githubRepositoryId", "githubInstallationId")
    SELECT id, "createdAt", "updatedAt", "repositoryId", "installationId"
    FROM installation_repository_rights`
  );

  // update github_repository_installations autoincrement
  await knex.raw(
    `select setval('"github_repository_installations_id_seq"', (SELECT MAX(id) FROM github_repository_installations))`
  );
  // --

  // -- github_installation_users
  await knex.schema.createTable("github_installation_users", (table) => {
    table.bigIncrements("id").primary();
    table.dateTime("createdAt").notNullable();
    table.dateTime("updatedAt").notNullable();
    table.integer("userGithubId").notNullable().unique();
    table.bigInteger("githubInstallationId").notNullable().index();
    table.foreign("githubInstallationId").references("github_installations.id");
  });

  // move data from user_installation_rights to github_installation_users
  await knex.raw(
    `INSERT INTO github_installation_users (id, "createdAt", "updatedAt", "userGithubId", "githubInstallationId")
    SELECT user_installation_rights.id, user_installation_rights."createdAt", user_installation_rights."updatedAt", users."githubId", user_installation_rights."installationId"
    FROM user_installation_rights join users on users.id = user_installation_rights."userId"`
  );

  // update github_installation_users autoincrement
  await knex.raw(
    `select setval('"github_installation_users_id_seq"', (SELECT MAX(id) FROM github_installation_users))`
  );
  //

  // -- users
  await knex.schema.alterTable("users", (table) => {
    table.renameColumn("login", "slug");
    table.index("slug");
    table.dropColumn("privateSync");
    table.dropColumn("githubScopes");
    table.dropColumn("scopes");
  });
  // --

  // -- teams
  await knex.schema.createTable("teams", (table) => {
    table.bigIncrements("id").primary();
    table.dateTime("createdAt").notNullable();
    table.dateTime("updatedAt").notNullable();
    table.string("name");
    table.string("slug").notNullable().index();
    table.bigInteger("githubAccountId").index();
    table.foreign("githubAccountId").references("github_accounts.id");
  });

  // move data from organizations to teams
  await knex.raw(
    `INSERT INTO teams (id, "createdAt", "updatedAt", name, slug, "githubAccountId")
    SELECT organizations.id, organizations."createdAt", organizations."updatedAt", organizations.name, organizations.login, github_accounts.id
    FROM organizations join github_accounts on github_accounts."githubOrganizationId" = organizations.id`
  );

  // update teams autoincrement
  await knex.raw(
    `select setval('"teams_id_seq"', (SELECT MAX(id) FROM teams))`
  );
  // --

  // -- accounts
  await knex.schema.alterTable("accounts", (table) => {
    table.bigInteger("teamId").index();
    table.foreign("teamId").references("teams.id");
  });

  // update teamId
  await knex.raw(`UPDATE accounts SET "teamId" = "organizationId"`);

  await knex.raw(
    `
    ALTER TABLE accounts DROP CONSTRAINT accounts_only_one_owner;
    ALTER TABLE accounts ADD CONSTRAINT accounts_only_one_owner CHECK (num_nonnulls("userId", "teamId") = 1);
    `
  );

  await knex.schema.alterTable("accounts", (table) => {
    table.dropColumn("organizationId");
  });
  // --

  await knex.schema.createTable("team_users", (table) => {
    table.bigIncrements("id").primary();
    table.dateTime("createdAt").notNullable();
    table.dateTime("updatedAt").notNullable();
    table.bigInteger("userId").notNullable().index();
    table.foreign("userId").references("users.id");
    table.bigInteger("teamId").notNullable().index();
    table.foreign("teamId").references("teams.id");
    table.enum("userLevel", ["member", "owner"]).notNullable();
  });

  // move data from user_organization_rights to team_users
  await knex.raw(
    `INSERT INTO team_users (id, "createdAt", "updatedAt", "userId", "teamId", "userLevel")
    SELECT id, "createdAt", "updatedAt", "userId", "organizationId", 'owner' as "userLevel"
    FROM user_organization_rights`
  );

  // update team_users autoincrement
  await knex.raw(
    `select setval('"team_users_id_seq"', (SELECT MAX(id) FROM team_users))`
  );
  // --

  // -- projects
  await knex.schema.createTable("projects", (table) => {
    table.bigIncrements("id").primary();
    table.dateTime("createdAt").notNullable();
    table.dateTime("updatedAt").notNullable();
    table.string("name").notNullable().index();
    table.string("slug").notNullable().index();
    table.string("token").notNullable().index();
    table.boolean("private");
    table.string("baselineBranch");
    table.bigInteger("accountId").index();
    table.foreign("accountId").references("accounts.id");
    table.bigInteger("githubRepositoryId").unique();
    table.foreign("githubRepositoryId").references("github_repositories.id");
  });

  // move data from repositories to projects
  await knex.raw(
    `INSERT INTO projects (id, "createdAt", "updatedAt", name, slug, token, private, "baselineBranch", "accountId", "githubRepositoryId")
    SELECT repositories.id, repositories."createdAt", repositories."updatedAt", repositories.name, repositories.name, repositories.token,
    (CASE WHEN repositories."forcedPrivate" = true THEN true
      ELSE null
    END) as private
    , repositories."baselineBranch", accounts.id as "accountId", github_repositories.id as "githubRepositoryId"
    FROM repositories
    JOIN accounts ON accounts."userId" = repositories."userId" OR accounts."teamId" = repositories."organizationId"
    JOIN github_repositories ON github_repositories."githubId" = repositories."githubId"`
  );

  // update projects autoincrement
  await knex.raw(
    `select setval('"projects_id_seq"', (SELECT MAX(id) FROM projects))`
  );
  // --

  // -- builds
  await knex.schema.alterTable("builds", (table) => {
    table.bigInteger("projectId").index();
    table.foreign("projectId").references("projects.id");
  });

  // update projectId
  await knex.raw(`UPDATE builds SET "projectId" = "repositoryId"`);

  // make projectId not null
  await knex.raw('ALTER TABLE builds ALTER COLUMN "projectId" SET NOT NULL');

  await knex.schema.alterTable("builds", (table) => {
    table.dropColumn("repositoryId");
  });
  // --

  // -- screenshot_buckets
  await knex.schema.alterTable("screenshot_buckets", (table) => {
    table.bigInteger("projectId").index();
    table.foreign("projectId").references("projects.id");
  });

  // update projectId
  await knex.raw(`UPDATE screenshot_buckets SET "projectId" = "repositoryId"`);

  // make projectId not null
  await knex.raw(
    'ALTER TABLE screenshot_buckets ALTER COLUMN "projectId" SET NOT NULL'
  );

  await knex.schema.alterTable("screenshot_buckets", (table) => {
    table.dropColumn("repositoryId");
  });
  // --

  // -- tests
  await knex.schema.alterTable("tests", (table) => {
    table.bigInteger("projectId").index();
    table.foreign("projectId").references("projects.id");
  });

  // update projectId
  await knex.raw(`UPDATE tests SET "projectId" = "repositoryId"`);

  // make projectId not null
  await knex.raw('ALTER TABLE tests ALTER COLUMN "projectId" SET NOT NULL');

  await knex.schema.alterTable("tests", (table) => {
    table.dropColumn("repositoryId");
  });
  // --

  // Drop tables
  await knex.schema.dropTable("user_repository_rights");
  await knex.schema.dropTable("user_organization_rights");
  await knex.schema.dropTable("synchronizations");
  await knex.schema.dropTable("installation_repository_rights");
  await knex.schema.dropTable("user_installation_rights");
  await knex.schema.dropTable("repositories");
  await knex.schema.dropTable("organizations");
  await knex.schema.dropTable("installations");

  // Cleanup orphaned data

  // Remove projects that does not have any builds
  await knex.raw(
    'delete from projects where id not in (select "projectId" from builds)'
  );

  // Remove team accounts that does not have any projects
  await knex.raw(
    'delete from accounts where id not in (select "accountId" from projects) and "teamId" is not null'
  );

  // Remove teams that does not have any team accounts
  await knex.raw(
    'delete from teams where id not in (select "teamId" from accounts)'
  );
};

export const down = async () => {
  throw new Error("There is no way to go back from hell 😈");
};
