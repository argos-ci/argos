/**
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.schema.createTable("project_domains", (table) => {
    table.bigIncrements("id").primary();
    table.dateTime("createdAt").notNullable();
    table.dateTime("updatedAt").notNullable();
    table.string("domain").notNullable().unique();
    table.enum("environment", ["preview", "production"]).notNullable();
    table.string("branch");
    table.bigInteger("projectId").unsigned().notNullable().index();
    table.boolean("internal").notNullable().defaultTo(false);
    table.foreign("projectId").references("projects.id").onDelete("cascade");
  });

  await knex.raw(`
    ALTER TABLE project_domains
    ADD CONSTRAINT project_domains_preview_branch_check
    CHECK (
      ("environment" = 'preview' AND "branch" IS NOT NULL)
      OR ("environment" = 'production')
    )
  `);
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.schema.dropTable("project_domains");
};
