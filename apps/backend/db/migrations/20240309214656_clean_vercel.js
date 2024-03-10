/**
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.schema.alterTable("projects", async (table) => {
    table.dropColumn("vercelProjectId");
  });

  await knex.schema.alterTable("accounts", async (table) => {
    table.dropColumn("vercelConfigurationId");
  });

  await knex.schema.dropTable("vercel_project_configurations");
  await knex.schema.dropTable("vercel_configurations");
  await knex.schema.dropTable("vercel_checks");
  await knex.schema.dropTable("vercel_deployments");
  await knex.schema.dropTable("vercel_projects");
};

export const down = async () => {
  throw new Error("There is no way to go back from hell 😈");
};
