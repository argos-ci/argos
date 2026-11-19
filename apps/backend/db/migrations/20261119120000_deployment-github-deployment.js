/**
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.schema.alterTable("deployments", (table) => {
    table.enum("authSource", [
      "project-token",
      "github-actions-oidc",
      "github-actions-tokenless",
    ]);
    table.bigInteger("githubDeploymentId");
  });
  await knex.schema.alterTable("projects", (table) => {
    table.boolean("githubDeploymentEnabled").notNullable().defaultTo(true);
  });
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.schema.alterTable("deployments", (table) => {
    table.dropColumn("authSource");
    table.dropColumn("githubDeploymentId");
  });
  await knex.schema.alterTable("projects", (table) => {
    table.dropColumn("githubDeploymentEnabled");
  });
};
