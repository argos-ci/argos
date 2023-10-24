/**
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.schema.table("github_pull_requests", (table) => {
    table.boolean("merged");
    table.boolean("draft");
  });
  await knex.raw(
    `UPDATE github_pull_requests SET "merged" = ("state" = 'closed' AND "mergedAt" IS NOT NULL), "draft" = false WHERE "jobStatus" = 'complete'`,
  );
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.schema.table("github_pull_requests", (table) => {
    table.dropColumn("merged");
    table.dropColumn("draft");
  });
};
