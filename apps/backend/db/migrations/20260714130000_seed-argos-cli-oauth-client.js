/**
 * Seed the first-party "Argos CLI" OAuth client.
 *
 * A public client (PKCE, no secret) using the Authorization Code + loopback
 * redirect flow (RFC 8252). Registered as verified so it shows the official
 * badge on the consent screen. Idempotent so it is safe across environments.
 *
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex("oauth_clients")
    .insert({
      clientId: "argos-cli",
      clientName: "Argos CLI",
      clientUri: "https://argos-ci.com",
      redirectUris: JSON.stringify([
        "http://localhost/callback",
        "http://127.0.0.1/callback",
      ]),
      grantTypes: JSON.stringify(["authorization_code", "refresh_token"]),
      responseTypes: JSON.stringify(["code"]),
      tokenEndpointAuthMethod: "none",
      isFirstParty: true,
      knownAppId: "argos-cli",
      verified: true,
    })
    .onConflict("clientId")
    .ignore();
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex("oauth_clients").where({ clientId: "argos-cli" }).del();
};
