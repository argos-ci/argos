/**
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.schema.table("github_pull_requests", (table) => {
    table.string("jobStatus");
    table.string("title");
    table.string("baseRef");
    table.string("baseSha");
    table.enum("state", ["open", "closed"]);
    table.dateTime("date");
    table.dateTime("closedAt");
    table.dateTime("mergedAt");
    table.bigInteger("creatorId").references("github_accounts.id");
  });
  await knex.raw("UPDATE github_pull_requests SET \"jobStatus\" = 'aborted'");
  await knex.raw(
    'ALTER TABLE github_pull_requests ALTER COLUMN "jobStatus" SET NOT NULL',
  );
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.schema.table("github_pull_requests", (table) => {
    table.dropColumn("jobStatus");
  });
};
