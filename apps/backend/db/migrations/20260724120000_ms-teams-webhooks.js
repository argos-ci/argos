/**
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.schema.createTable("ms_teams_webhooks", (table) => {
    table.bigIncrements("id").primary();
    table.dateTime("createdAt").notNullable();
    table.dateTime("updatedAt").notNullable();
    table.bigInteger("accountId").unsigned().notNullable();
    table.foreign("accountId").references("accounts.id").onDelete("cascade");

    // Label shown in the UI, usually the target channel name. Unlike Slack we
    // never learn the real channel from the API: a Workflows webhook is opaque.
    table.string("name").notNullable();
    // Workflows URLs are long (SAS signature in the query string), so `text`.
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
  await knex.schema.dropTable("ms_teams_webhooks");
};
