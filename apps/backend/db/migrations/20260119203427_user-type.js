/**
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.schema.alterTable("users", (table) => {
    table.enum("type", ["user", "bot"]).notNullable().defaultTo("user");
  });

  await knex("users").insert({
    createdAt: knex.raw("now()"),
    updatedAt: knex.raw("now()"),
    email: "argos-bot@no-reply.argos-ci.com",
    type: "bot",
  });

  const [argosBot] = await knex("users").where(
    "email",
    "argos-bot@no-reply.argos-ci.com",
  );

  await knex("accounts").insert({
    createdAt: knex.raw("now()"),
    updatedAt: knex.raw("now()"),
    userId: argosBot.id,
    name: "Argos Bot",
    slug: "argos[bot]",
  });

  await knex("user_emails").insert({
    userId: argosBot.id,
    email: argosBot.email,
    verified: true,
  });
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex("user_emails")
    .where("email", "argos-bot@no-reply.argos-ci.com")
    .delete();
  await knex("accounts").where("slug", "argos[bot]").delete();
  await knex("users")
    .where("email", "argos-bot@no-reply.argos-ci.com")
    .delete();
  await knex.schema.alterTable("users", (table) => {
    table.dropColumn("type");
  });
};
