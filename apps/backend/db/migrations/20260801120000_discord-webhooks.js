/**
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.schema.createTable("discord_webhooks", (table) => {
    table.bigIncrements("id").primary();
    table.dateTime("createdAt").notNullable();
    table.dateTime("updatedAt").notNullable();
    table.bigInteger("accountId").unsigned().notNullable();
    table.foreign("accountId").references("accounts.id").onDelete("cascade");

    // Label shown in the UI, usually the target channel name. Like Teams and
    // unlike Slack, we never learn the real channel: a webhook is outbound-only.
    table.string("name").notNullable();
    // `https://discord.com/api/webhooks/<id>/<token>` — the token alone is
    // ~70 characters, so `text` rather than a bounded string.
    table.text("url").notNullable();
    table.dateTime("connectedAt").notNullable();

    // Names are the only handle users have to tell webhooks apart. The index
    // backing this constraint leads with `accountId`, which also serves the
    // per-account lookups — no separate index needed.
    table.unique(["accountId", "name"]);
  });
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.schema.dropTable("discord_webhooks");
};
