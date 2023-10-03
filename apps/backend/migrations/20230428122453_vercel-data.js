/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async (knex) => {
  await knex.schema.createTable("vercel_projects", (table) => {
    table.bigIncrements("id").primary();
    table.dateTime("createdAt").notNullable();
    table.dateTime("updatedAt").notNullable();
    table.string("vercelId").notNullable().unique();
  });

  await knex.schema.createTable("vercel_configurations", (table) => {
    table.bigIncrements("id").primary();
    table.dateTime("createdAt").notNullable();
    table.dateTime("updatedAt").notNullable();
    table.string("vercelId").notNullable().unique();
    table.string("vercelTeamId");
    table.boolean("deleted").notNullable().defaultTo(false);
    table.string("vercelAccessToken");
  });

  await knex.schema.createTable("vercel_project_configurations", (table) => {
    table.bigIncrements("id").primary();
    table.dateTime("createdAt").notNullable();
    table.dateTime("updatedAt").notNullable();
    table.bigInteger("vercelProjectId").notNullable().index();
    table.foreign("vercelProjectId").references("vercel_projects.id");
    table.bigInteger("vercelConfigurationId").notNullable().index();
    table
      .foreign("vercelConfigurationId")
      .references("vercel_configurations.id");
  });

  await knex.schema.alterTable("projects", (table) => {
    table.bigInteger("vercelProjectId").index();
    table.foreign("vercelProjectId").references("vercel_projects.id");
  });

  await knex.schema.alterTable("accounts", (table) => {
    table.bigInteger("vercelConfigurationId").index();
    table
      .foreign("vercelConfigurationId")
      .references("vercel_configurations.id");
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = async (knex) => {
  await knex.schema.alterTable("projects", (table) => {
    table.dropColumn("vercelProjectId");
  });
  await knex.schema.alterTable("accounts", (table) => {
    table.dropColumn("vercelConfigurationId");
  });
  await knex.schema.dropTable("vercel_project_configurations");
  await knex.schema.dropTable("vercel_configurations");
  await knex.schema.dropTable("vercel_projects");
};
