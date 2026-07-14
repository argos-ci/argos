/**
 * OAuth 2.1 Authorization Server tables.
 *
 * Argos acts as its own OAuth Authorization Server. These tables back the
 * authorization-code (+ PKCE) and refresh-token grants used by the CLI and by
 * MCP clients. Authorization codes themselves live in Redis (single-use,
 * short-lived) — see `src/oauth/authorization-code.ts` — so there is no code
 * table here.
 *
 * - `oauth_clients`: registered clients (first-party + dynamically registered).
 * - `oauth_grants`: the persistent consent of a user for a client (the record
 *   surfaced as an "authorized application" in settings).
 * - `oauth_grant_accounts`: which accounts (orgs) a grant is scoped to, mirroring
 *   `user_access_token_scopes`.
 * - `oauth_access_tokens` / `oauth_refresh_tokens`: opaque tokens, stored hashed.
 *
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.schema.createTable("oauth_clients", (table) => {
    table.bigIncrements("id").primary();
    table.dateTime("createdAt").notNullable().defaultTo(knex.fn.now());
    table.dateTime("updatedAt").notNullable().defaultTo(knex.fn.now());

    // Public client identifier handed to clients (fixed slug for first-party
    // clients, random for dynamically-registered ones).
    table.string("clientId").notNullable().unique();
    // sha256(client_secret); null for public clients (PKCE only).
    table.string("clientSecretHash", 64);

    table.string("clientName").notNullable();
    table.string("clientUri");
    table.string("logoUri");

    // Arrays of strings.
    table.jsonb("redirectUris").notNullable();
    table.jsonb("grantTypes").notNullable();
    table.jsonb("responseTypes").notNullable();

    // Space-delimited allowed scopes; null means "any supported scope".
    table.text("scope");
    table.string("tokenEndpointAuthMethod").notNullable().defaultTo("none");

    // RFC 7591 stable software identifier (used for verification matching).
    table.string("softwareId");
    table.boolean("isFirstParty").notNullable().defaultTo(false);
    // Id into the curated known-apps registry when this client matches a
    // well-known agent; drives the verified badge + official logo.
    table.string("knownAppId");
    table.boolean("verified").notNullable().defaultTo(false);

    // The user who dynamically registered the client (null for first-party).
    table.bigInteger("createdByUserId");
    table
      .foreign("createdByUserId")
      .references("users.id")
      .onDelete("SET NULL");
    // sha256 of the RFC 7591 registration access token (client-management).
    table.string("registrationAccessTokenHash", 64).unique();

    table.index("createdByUserId");
  });

  await knex.schema.createTable("oauth_grants", (table) => {
    table.bigIncrements("id").primary();
    table.dateTime("createdAt").notNullable().defaultTo(knex.fn.now());
    table.dateTime("updatedAt").notNullable().defaultTo(knex.fn.now());

    table.bigInteger("userId").notNullable();
    table.foreign("userId").references("users.id").onDelete("CASCADE");
    table.bigInteger("oauthClientId").notNullable();
    table
      .foreign("oauthClientId")
      .references("oauth_clients.id")
      .onDelete("CASCADE");

    // Array of granted scope strings.
    table.jsonb("scopes").notNullable();
    table.dateTime("lastUsedAt");
    table.dateTime("revokedAt");

    // One consent record per (user, client); re-consent updates this row.
    table.unique(["userId", "oauthClientId"]);
    table.index("userId");
  });

  await knex.schema.createTable("oauth_grant_accounts", (table) => {
    table.bigIncrements("id").primary();
    table.dateTime("createdAt").notNullable().defaultTo(knex.fn.now());
    table.dateTime("updatedAt").notNullable().defaultTo(knex.fn.now());

    table.bigInteger("oauthGrantId").notNullable();
    table
      .foreign("oauthGrantId")
      .references("oauth_grants.id")
      .onDelete("CASCADE");
    table.bigInteger("accountId").notNullable();
    table.foreign("accountId").references("accounts.id").onDelete("CASCADE");

    table.unique(["oauthGrantId", "accountId"]);
  });

  await knex.schema.createTable("oauth_access_tokens", (table) => {
    table.bigIncrements("id").primary();
    table.dateTime("createdAt").notNullable().defaultTo(knex.fn.now());
    table.dateTime("updatedAt").notNullable().defaultTo(knex.fn.now());

    table.bigInteger("oauthGrantId").notNullable();
    table
      .foreign("oauthGrantId")
      .references("oauth_grants.id")
      .onDelete("CASCADE");

    // sha256(rawToken) — the raw token is only ever returned once.
    table.string("tokenHash", 64).notNullable().unique();
    table.jsonb("scopes").notNullable();
    // Resource indicator (RFC 8707) this token is bound to (audience).
    table.string("resource");
    table.dateTime("expiresAt").notNullable();
    table.dateTime("lastUsedAt");
    table.dateTime("revokedAt");

    table.index("oauthGrantId");
  });

  await knex.schema.createTable("oauth_refresh_tokens", (table) => {
    table.bigIncrements("id").primary();
    table.dateTime("createdAt").notNullable().defaultTo(knex.fn.now());
    table.dateTime("updatedAt").notNullable().defaultTo(knex.fn.now());

    table.bigInteger("oauthGrantId").notNullable();
    table
      .foreign("oauthGrantId")
      .references("oauth_grants.id")
      .onDelete("CASCADE");

    table.string("tokenHash", 64).notNullable().unique();
    table.jsonb("scopes").notNullable();
    table.string("resource");
    table.dateTime("expiresAt").notNullable();
    table.dateTime("revokedAt");
    // Set when this token is rotated; presenting a rotated token again is
    // treated as reuse (token theft) and revokes the whole grant.
    table.bigInteger("replacedByTokenId");
    table
      .foreign("replacedByTokenId")
      .references("oauth_refresh_tokens.id")
      .onDelete("SET NULL");

    table.index("oauthGrantId");
  });
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.schema.dropTable("oauth_refresh_tokens");
  await knex.schema.dropTable("oauth_access_tokens");
  await knex.schema.dropTable("oauth_grant_accounts");
  await knex.schema.dropTable("oauth_grants");
  await knex.schema.dropTable("oauth_clients");
};
