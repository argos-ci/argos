/**
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.schema.createTable("google_users", (table) => {
    table.bigIncrements("id").primary();
    table.dateTime("createdAt").notNullable();
    table.dateTime("updatedAt").notNullable();
    table.string("googleId").notNullable().unique();
    table.string("name");
    table.string("primaryEmail");
    table.jsonb("emails");
    table.dateTime("lastLoggedAt");
  });

  await knex.schema.alterTable("users", async (table) => {
    table.bigInteger("googleUserId_fk").index();
    table.foreign("googleUserId_fk").references("google_users.id");
  });

  await knex.raw(`
      INSERT INTO google_users ("createdAt", "updatedAt", "googleId")
    SELECT now() as "createdAt", now() as "updatedAt", "googleUserId"
    FROM users WHERE "googleUserId" is not null
    `);

  const googleUsers = await knex("google_users").select("id", "googleId");
  for (const googleUser of googleUsers) {
    await knex("users")
      .where("googleUserId", googleUser.googleId)
      .update("googleUserId_fk", googleUser.id);
  }

  await knex.schema.alterTable("users", async (table) => {
    table.dropColumn("googleUserId");
    table.renameColumn("googleUserId_fk", "googleUserId");
  });
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.schema.alterTable("users", async (table) => {
    table.dropColumn("googleUserId");
  });

  await knex.schema.alterTable("users", async (table) => {
    table.string("googleUserId");
  });

  await knex.schema.dropTable("google_users");
};
