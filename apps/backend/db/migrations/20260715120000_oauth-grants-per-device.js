/**
 * Make OAuth grants per-authorization (effectively per-device/session) instead of
 * one shared record per (user, client).
 *
 * The original `oauth` migration enforced `unique(["userId", "oauthClientId"])`, so
 * every `argos login` under one user reused a single grant and revoked the sibling
 * session's tokens (last-login-wins). Dropping the constraint lets each login mint
 * its own grant and refresh-token family, so two machines can stay authenticated at
 * the same time. See ARG-466.
 *
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.schema.alterTable("oauth_grants", (table) => {
    table.dropUnique(["userId", "oauthClientId"]);
  });
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.schema.alterTable("oauth_grants", (table) => {
    table.unique(["userId", "oauthClientId"]);
  });
};
