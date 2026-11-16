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
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.schema.alterTable("deployments", (table) => {
    table.dropColumn("authSource");
    table.dropColumn("githubDeploymentId");
  });
};
