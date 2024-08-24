/**
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.schema.alterTable("github_installations", (table) => {
    table.enum("app", ["main", "light"]).notNullable().defaultTo("main");
  });

  await knex.schema.alterTable("accounts", (table) => {
    table.bigInteger("githubLightInstallationId").index();
    table
      .foreign("githubLightInstallationId")
      .references("github_installations.id");
  });
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.schema.alterTable("github_installations", (table) => {
    table.dropColumn("app");
  });

  await knex.schema.alterTable("accounts", (table) => {
    table.dropColumn("githubLightInstallationId");
  });
};
