/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async (knex) => {
  await knex.schema.alterTable("team_users", (table) => {
    table.string("ssoSubject");
    table.dateTime("ssoVerifiedAt");
    table.enum("lastAuthMethod", [
      "email",
      "google",
      "github",
      "gitlab",
      "saml",
    ]);
  });

  await knex.schema.alterTable("team_saml_configs", (table) => {
    table.dateTime("enforcedAt");
  });

  await knex.raw(`ALTER TABLE team_saml_configs
    ADD CONSTRAINT team_saml_configs_enforced_requires_enforcedAt
    CHECK (
      (enforced AND "enforcedAt" IS NOT NULL)
      OR
      (NOT enforced AND "enforcedAt" IS NULL)
    );`);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = async (knex) => {
  await knex.raw(`
    ALTER TABLE team_saml_configs
    DROP CONSTRAINT IF EXISTS team_saml_configs_enforced_requires_enforcedAt;
  `);

  await knex.schema.alterTable("team_saml_configs", (table) => {
    table.dropColumn("enforcedAt");
  });

  await knex.schema.alterTable("team_users", (table) => {
    table.dropColumn("ssoSubject");
    table.dropColumn("ssoVerifiedAt");
    table.dropColumn("lastAuthMethod");
  });

  await knex.raw(`
    DROP TYPE IF EXISTS "lastAuthMethod";
  `);
};
