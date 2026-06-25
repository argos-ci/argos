/**
 * Replaces the `autoIgnore` column with a more flexible `ignoreConfig` column.
 *
 * `ignoreConfig` only stores values that differ from the default (ignore
 * feature enabled + auto-ignore enabled with 3 occurrences):
 * - `NULL` / `{}`            -> default (ignore + auto-ignore enabled, 3 changes)
 * - `{ "enabled": false }`   -> ignore feature disabled
 * - `{ "autoIgnore": false }`-> auto-ignore disabled
 * - `{ "autoIgnore": { "changes": N } }` -> custom auto-ignore threshold
 *
 * Migration of the previous `autoIgnore` column:
 * - `NULL`            -> auto-ignore was disabled -> `{ "autoIgnore": false }`
 * - `{ "changes": 3 }`-> matches default          -> `NULL`
 * - `{ "changes": N }`-> custom threshold         -> `{ "autoIgnore": { "changes": N } }`
 *
 * The legacy `autoIgnore` column is intentionally kept for now; it will be
 * dropped in a follow-up migration once the rollout is complete.
 *
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.schema.alterTable("projects", (table) => {
    table.jsonb("ignoreConfig");
  });

  await knex.raw(`
    UPDATE projects SET "ignoreConfig" = CASE
      WHEN "autoIgnore" IS NULL
        THEN '{"autoIgnore": false}'::jsonb
      WHEN ("autoIgnore"->>'changes')::int = 3
        THEN NULL
      ELSE jsonb_build_object(
        'autoIgnore',
        jsonb_build_object('changes', ("autoIgnore"->>'changes')::int)
      )
    END
  `);
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.schema.alterTable("projects", (table) => {
    table.dropColumn("ignoreConfig");
  });
};
