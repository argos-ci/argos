/**
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.schema.alterTable("teams", async (table) => {
    table.enum("defaultUserLevel", ["member", "contributor"]);
  });

  await knex("teams").update({ defaultUserLevel: "member" });

  await knex.schema.raw(`
    ALTER TABLE "teams"
    ALTER COLUMN "defaultUserLevel" SET NOT NULL
  `);

  await knex.schema.raw(`
    ALTER TABLE "team_users"
    DROP CONSTRAINT "team_users_userLevel_check",
    ADD CONSTRAINT "team_users_userLevel_check" 
    CHECK ("userLevel" = ANY (ARRAY['owner'::text, 'member'::text, 'contributor'::text]))
  `);

  await knex.schema.createTable("project_users", (table) => {
    table.bigIncrements("id").primary();
    table.dateTime("createdAt").notNullable();
    table.dateTime("updatedAt").notNullable();
    table.bigInteger("userId").notNullable().index();
    table.foreign("userId").references("users.id");
    table.bigInteger("projectId").notNullable().index();
    table.foreign("projectId").references("projects.id");
    table.enum("userLevel", ["admin", "reviewer", "viewer"]).notNullable();
    table.unique(["userId", "projectId"]);
  });

  await knex.schema.alterTable("plans", (table) => {
    table
      .boolean("fineGrainedAccessControlIncluded")
      .notNullable()
      .defaultTo(false);
  });
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.schema.alterTable("teams", async (table) => {
    table.dropColumn("defaultUserLevel");
  });

  await knex.schema.raw(`
    ALTER TABLE "team_users"
    DROP CONSTRAINT "team_users_userLevel_check",
    ADD CONSTRAINT "team_users_userLevel_check" 
    CHECK ("userLevel" = ANY (ARRAY['owner'::text, 'member'::text]))
  `);

  await knex.schema.dropTable("project_users");

  await knex.schema.alterTable("plans", (table) => {
    table.dropColumn("fineGrainedAccessControlIncluded");
  });
};
