/**
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.schema.alterTable("github_accounts", async (table) => {
    table.string("accessToken");
    table.string("scope");
    table.dateTime("lastLoggedAt");
  });

  // Fix inconsistent accounts that have githubAccountId but no accessToken
  await knex.raw(`
    update accounts set "githubAccountId" = null where id in (select accounts.id from accounts JOIN users ON accounts."userId" = users.id where accounts."githubAccountId" is not null and users."accessToken" is null);
  `);

  const result = await knex.raw(
    `select "accounts"."githubAccountId", "users"."accessToken" from accounts JOIN users ON accounts."userId" = users.id where accounts."githubAccountId" is not null;`,
  );

  /**
   * @type {Array<{githubAccountId: string, accessToken: string}>}
   */
  const rows = result.rows;

  for (const row of rows) {
    await knex("github_accounts")
      .where("id", row.githubAccountId)
      .update({ accessToken: row.accessToken });
  }
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.schema.alterTable("github_accounts", async (table) => {
    table.dropColumn("accessToken");
    table.dropColumn("scope");
    table.dropColumn("lastLoggedAt");
  });
};
