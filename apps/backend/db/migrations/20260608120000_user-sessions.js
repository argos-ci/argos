/**
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.schema.createTable("user_sessions", (table) => {
    table.bigIncrements("id").primary();
    table.dateTime("createdAt").notNullable().defaultTo(knex.fn.now());
    table.dateTime("updatedAt").notNullable().defaultTo(knex.fn.now());

    table.bigInteger("userId").notNullable();
    table.foreign("userId").references("users.id").onDelete("CASCADE");

    // sha256(rawToken) — the raw token lives only in the cookie.
    table.string("tokenHash").notNullable().unique();

    // Idle tracking (slid forward on activity) and absolute expiry (never extended).
    table.dateTime("lastSeenAt").notNullable().defaultTo(knex.fn.now());
    table.dateTime("expiresAt").notNullable();
    table.dateTime("revokedAt");

    // Cosmetic metadata, never used as a security input.
    table.string("ip");
    table.string("userAgent");
    table.string("deviceLabel");
    // Approximate geolocation captured at login (from Cloudflare geo headers),
    // shown in the session-management UI.
    table.string("city");
    table.string("region");
    table.string("country");
  });

  // "Active sessions for a user", used by the session-management endpoints.
  await knex.raw(`
    CREATE INDEX user_sessions_active_user
    ON user_sessions ("userId")
    WHERE "revokedAt" IS NULL
  `);
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.schema.dropTable("user_sessions");
};
