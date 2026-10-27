/**
 * The project's URL as its GitLab instance reports it, so links to projects on
 * a self-hosted instance stop pointing at gitlab.com. Existing rows read null
 * until their next sync.
 *
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.schema.alterTable("gitlab_projects", (table) => {
    table.text("webUrl");
  });
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.schema.alterTable("gitlab_projects", (table) => {
    table.dropColumn("webUrl");
  });
};
