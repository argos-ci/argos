/**
 * @param { import("knex").Knex } knex
 */
export async function up(knex) {
  await knex.schema.alterTable("projects", (table) => {
    table.boolean("deploymentEnabled").notNullable().defaultTo(true);
  });

  await knex.schema.alterTable("deployment_aliases", (table) => {
    table.dropIndex("deploymentId");
    table.index(["deploymentId", "type"]);
  });

  await knex.schema.alterTable("deployments", (table) => {
    table.dropIndex("projectId");
    table.index(["projectId", "environment"]);
  });
}

/**
 * @param { import("knex").Knex } knex
 */
export async function down(knex) {
  await knex.schema.alterTable("projects", (table) => {
    table.dropColumn("deploymentEnabled");
  });

  await knex.schema.alterTable("deployment_aliases", (table) => {
    table.dropIndex(["deploymentId", "type"]);
    table.index("deploymentId");
  });

  await knex.schema.alterTable("deployments", (table) => {
    table.dropIndex(["projectId", "environment"]);
    table.index("projectId");
  });
}
