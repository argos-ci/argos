/**
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.raw(
    `ALTER TABLE github_accounts DROP CONSTRAINT github_accounts_type_check`,
  );
  await knex.raw(
    `ALTER TABLE github_accounts ADD CONSTRAINT github_accounts_type_check CHECK (type = ANY (ARRAY['user'::text, 'organization'::text, 'bot'::text]))`,
  );
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.raw(
    `ALTER TABLE github_accounts DROP CONSTRAINT github_accounts_type_check`,
  );
  await knex.raw(
    `ALTER TABLE github_accounts ADD CONSTRAINT github_accounts_type_check CHECK (type = ANY (ARRAY['user'::text, 'organization'::text]))`,
  );
};
