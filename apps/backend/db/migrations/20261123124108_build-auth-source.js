/**
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.raw(`ALTER TABLE builds ADD COLUMN "authSource" text`);
  await knex.raw(
    `ALTER TABLE builds ADD CONSTRAINT "builds_authSource_check" CHECK ("authSource" = ANY (ARRAY['project-token'::text, 'github-actions-oidc'::text, 'github-actions-tokenless'::text])) NOT VALID`,
  );
  await knex.raw(
    `ALTER TABLE builds VALIDATE CONSTRAINT "builds_authSource_check"`,
  );
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.raw(`ALTER TABLE builds DROP COLUMN "authSource"`);
};

export const config = { transaction: false };
