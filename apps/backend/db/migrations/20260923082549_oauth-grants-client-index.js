/**
 * Index the `oauth_grants."oauthClientId"` foreign key.
 *
 * Nothing indexed it, so deleting a client cascaded through a scan of every
 * grant — and the hourly purge of abandoned registrations deletes clients by
 * the thousand, each checked for grants first.
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async (knex) => {
  await knex.raw(
    `CREATE INDEX CONCURRENTLY IF NOT EXISTS oauth_grants_oauthclientid_index
       ON oauth_grants ("oauthClientId")`,
  );
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = async (knex) => {
  await knex.raw(
    `DROP INDEX CONCURRENTLY IF EXISTS oauth_grants_oauthclientid_index`,
  );
};

export const config = { transaction: false };
