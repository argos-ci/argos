/**
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.schema.createTable("gitlab_projects", async (table) => {
    table.bigIncrements("id").primary();
    table.dateTime("createdAt").notNullable();
    table.dateTime("updatedAt").notNullable();
    table.string("name").notNullable();
    table.string("path").notNullable();
    table.string("pathWithNamespace").notNullable();
    table.enum("visibility", ["public", "internal", "private"]).notNullable();
    table.string("defaultBranch").notNullable();
    table.integer("gitlabId").unsigned().notNullable();
  });

  await knex.schema.alterTable("projects", async (table) => {
    table.bigInteger("gitlabProjectId");
    table.foreign("gitlabProjectId").references("gitlab_projects.id");
  });
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.schema.alterTable("projects", async (table) => {
    table.dropColumn("gitlabProjectId");
  });

  await knex.schema.dropTable("gitlab_projects");
};
