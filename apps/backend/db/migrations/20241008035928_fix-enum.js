/**
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.raw(
    `ALTER TABLE builds DROP CONSTRAINT "builds_baseBranchResolvedFrom_check"`,
  );
  await knex.raw(
    `ALTER TABLE builds ADD CONSTRAINT "builds_baseBranchResolvedFrom_check" CHECK ("baseBranchResolvedFrom" = ANY (ARRAY['user'::text, 'pull-request'::text, 'project'::text]))`,
  );
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.raw(
    `ALTER TABLE builds DROP CONSTRAINT "builds_baseBranchResolvedFrom_check"`,
  );
  await knex.raw(
    `ALTER TABLE builds ADD CONSTRAINT "builds_baseBranchResolvedFrom_check" CHECK ("baseBranchResolvedFrom" = ANY (ARRAY['sdk'::text, 'pull-request'::text, 'project'::text]))`,
  );
};
