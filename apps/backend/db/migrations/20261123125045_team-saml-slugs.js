/**
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  // No foreign key to the team: the row must outlive it, or deleting the team
  // would free the slug for another team's SAML.
  await knex.schema.createTable("team_saml_slugs", (table) => {
    table.bigIncrements("id").primary();
    table.dateTime("createdAt").notNullable();
    table.dateTime("updatedAt").notNullable();
    table.string("slug", 255).notNullable().unique();
    table.bigInteger("teamId").notNullable();
  });
  await knex.raw(`
    INSERT INTO team_saml_slugs ("createdAt", "updatedAt", slug, "teamId")
    SELECT NOW(), NOW(), accounts.slug, accounts."teamId"
    FROM team_saml_configs
    JOIN accounts ON accounts.id = team_saml_configs."accountId"
    WHERE accounts."teamId" IS NOT NULL
    ON CONFLICT (slug) DO NOTHING
  `);
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.schema.dropTable("team_saml_slugs");
};
