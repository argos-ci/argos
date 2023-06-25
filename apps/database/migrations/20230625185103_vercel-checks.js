/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async (knex) => {
  await knex.schema.createTable("vercel_deployments", (table) => {
    table.bigIncrements("id").primary();
    table.dateTime("createdAt").notNullable();
    table.dateTime("updatedAt").notNullable();
    table.string("vercelId").notNullable().unique();
    table.string("url").notNullable();
    table.string("githubCommitRef");
    table.string("githubCommitSha");
    table.string("githubPrId");
    table.bigInteger("vercelProjectId").index().notNullable();
    table.foreign("vercelProjectId").references("vercel_projects.id");
  });

  await knex.schema.createTable("vercel_checks", (table) => {
    table.bigIncrements("id").primary();
    table.dateTime("createdAt").notNullable();
    table.dateTime("updatedAt").notNullable();
    table.string("vercelId").notNullable().unique();
    table.bigInteger("vercelDeploymentId").index().notNullable();
    table.foreign("vercelDeploymentId").references("vercel_deployments.id");
    table.bigInteger("buildId").index();
    table.foreign("buildId").references("builds.id");
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = async (knex) => {
  await knex.schema.dropTable("vercel_checks");
  await knex.schema.dropTable("vercel_deployments");
};
