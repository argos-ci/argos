/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async (knex) => {
  await knex.raw(`
    create index concurrently if not exists
      builds_project_type_name_createdat_id_idx
    on builds ("projectId", "type", "name", "createdAt" desc, "id");
  `);

  await knex.raw(`
    create index concurrently if not exists
      tests_projectid_buildname_createdat_id_idx
    on tests ("projectId", "buildName", "createdAt" desc, "id" desc);
  `);

  await knex.raw(`
    create index concurrently if not exists
      screenshot_diffs_buildid_notnull_include_testid_idx
    on screenshot_diffs ("buildId")
    include ("testId")
    where "testId" is not null;
  `);

  await knex.raw(`
    create index concurrently if not exists
      screenshot_diffs_testid_createdat_desc_cmp_notnull_idx
    on screenshot_diffs ("testId", "createdAt" desc)
    include ("compareScreenshotId")
    where "compareScreenshotId" is not null;
  `);

  await knex.raw(`
    drop index concurrently if exists screenshot_diffs_testid_index;
  `);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = async (knex) => {
  await knex.raw(`
    drop index concurrently if exists builds_project_type_name_createdat_id_idx;
  `);

  await knex.raw(`
    drop index concurrently if exists tests_projectid_buildname_createdat_id_idx;
  `);

  await knex.raw(`
    drop index concurrently if exists screenshot_diffs_buildid_notnull_include_testid_idx;
  `);

  await knex.raw(`
    drop index concurrently if exists screenshot_diffs_testid_createdat_desc_cmp_notnull_idx;
  `);

  await knex.raw(`
    create index concurrently if not exists screenshot_diffs_testid_index
    on screenshot_diffs ("testId");
  `);
};

export const config = { transaction: false };
