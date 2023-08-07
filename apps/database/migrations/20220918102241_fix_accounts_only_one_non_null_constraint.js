/**
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await await knex.raw(
    "ALTER TABLE accounts DROP CONSTRAINT accounts_only_one_non_null",
  );
  await knex.raw(
    `ALTER TABLE accounts ADD CONSTRAINT accounts_only_one_owner CHECK (num_nonnulls("userId", "organizationId") = 1)`,
  );
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await await knex.raw(
    "ALTER TABLE accounts DROP CONSTRAINT accounts_only_one_owner",
  );
  await knex.raw(
    'ALTER TABLE accounts ADD CONSTRAINT accounts_only_one_non_null CHECK ("userId" IS NOT NULL OR "organizationId" IS NOT NULL)',
  );
};
