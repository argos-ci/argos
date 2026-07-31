/**
 * Passkeys (WebAuthn credentials) usable as a sign-in method.
 *
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.schema.createTable("user_passkeys", (table) => {
    table.bigIncrements("id").primary();
    table.dateTime("createdAt").notNullable().defaultTo(knex.fn.now());
    table.dateTime("updatedAt").notNullable().defaultTo(knex.fn.now());

    table.bigInteger("userId").notNullable();
    table.foreign("userId").references("users.id").onDelete("CASCADE");

    // Base64URL-encoded credential id. Unique across every account: a
    // discoverable credential is resolved to its owner from this alone, which is
    // what lets "Continue with Passkey" work without an email being typed first.
    table.string("credentialId").notNullable().unique();
    // Base64URL-encoded COSE public key. Public by nature — the private key
    // never leaves the authenticator.
    table.text("publicKey").notNullable();
    // Signature counter, for replay detection. Synced providers keep it at 0.
    table.bigInteger("counter").notNullable().defaultTo(0);
    // Transports the authenticator reported, replayed as a browser hint.
    table.jsonb("transports");
    // "singleDevice" | "multiDevice", and whether the credential is backed up by
    // its provider. Both are recommended to persist for later reference.
    table.string("deviceType").notNullable();
    table.boolean("backedUp").notNullable();
    // Authenticator Attestation GUID: identifies the provider (1Password,
    // iCloud Keychain, a YubiKey model…), used to name the passkey on creation.
    table.string("aaguid");

    // User-facing label, defaulted from the authenticator and renameable.
    table.string("name").notNullable();
    table.dateTime("lastUsedAt");
  });

  // "Passkeys of a user", for the settings list and the `excludeCredentials` of
  // a new registration.
  await knex.raw(`
    CREATE INDEX user_passkeys_user ON user_passkeys ("userId")
  `);

  // Passkey joins the set of methods a team membership can record as its last
  // authentication, so SAML enforcement keeps recognising how the user got in.
  await knex.raw(
    `ALTER TABLE team_users DROP CONSTRAINT "team_users_lastAuthMethod_check"`,
  );
  await knex.raw(
    `ALTER TABLE team_users ADD CONSTRAINT "team_users_lastAuthMethod_check" CHECK ("lastAuthMethod" = ANY (ARRAY['email'::text, 'google'::text, 'github'::text, 'gitlab'::text, 'saml'::text, 'passkey'::text]))`,
  );
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.raw(
    `UPDATE team_users SET "lastAuthMethod" = NULL WHERE "lastAuthMethod" = 'passkey'`,
  );
  await knex.raw(
    `ALTER TABLE team_users DROP CONSTRAINT "team_users_lastAuthMethod_check"`,
  );
  await knex.raw(
    `ALTER TABLE team_users ADD CONSTRAINT "team_users_lastAuthMethod_check" CHECK ("lastAuthMethod" = ANY (ARRAY['email'::text, 'google'::text, 'github'::text, 'gitlab'::text, 'saml'::text]))`,
  );

  await knex.schema.dropTable("user_passkeys");
};
