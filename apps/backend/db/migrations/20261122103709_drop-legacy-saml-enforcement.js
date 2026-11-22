const SCOPE_TABLES = ["user_access_token_scopes", "oauth_grant_accounts"];

/**
 * `teams.enforcedAuthMethod` and the scopes' `authMethod` replaced these
 * columns, which no code reads anymore. Nothing is copied from them first:
 * `team_saml_configs.enforced` is stale for teams that changed their required
 * method since, and copying it would require SAML again.
 *
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.schema.alterTable("team_saml_configs", (table) => {
    table.dropColumns("enforced", "enforcedAt");
  });
  for (const tableName of SCOPE_TABLES) {
    await knex.schema.alterTable(tableName, (table) => {
      table.dropColumn("samlAuthorized");
    });
  }
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.schema.alterTable("team_saml_configs", (table) => {
    table.boolean("enforced").notNullable().defaultTo(false);
    table.timestamp("enforcedAt", { useTz: true });
  });
  await knex.raw(`
    UPDATE team_saml_configs
    SET enforced = true, "enforcedAt" = now()
    FROM accounts
    JOIN teams ON teams.id = accounts."teamId"
    WHERE team_saml_configs."accountId" = accounts.id
    AND teams."enforcedAuthMethod" = 'saml'
  `);
  await knex.raw(`
    ALTER TABLE team_saml_configs
    ADD CONSTRAINT team_saml_configs_enforced_requires_enforcedat
    CHECK ((enforced AND "enforcedAt" IS NOT NULL) OR (NOT enforced AND "enforcedAt" IS NULL))
  `);
  for (const tableName of SCOPE_TABLES) {
    await knex.schema.alterTable(tableName, (table) => {
      table.boolean("samlAuthorized").notNullable().defaultTo(false);
    });
    await knex(tableName)
      .where("authMethod", "saml")
      .update({ samlAuthorized: true });
  }
};
