/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async (knex) => {
  await knex.raw(`
    create index concurrently if not exists
      builds_projectid_name_createdat_idx
    on builds ("projectId", "name", "createdAt" desc)
    include ("id", "prHeadCommit", "compareScreenshotBucketId");
  `);

  await knex.raw(`
    create index concurrently if not exists
      builds_projectid_prheadcommit_name_createdat_idx
    on builds ("projectId", "prHeadCommit", "name", "createdAt" desc)
    include ("id", "compareScreenshotBucketId")
    where "prHeadCommit" is not null;
  `);

  await knex.raw(`
    create index concurrently if not exists
      builds_projectid_comparescreenshotbucketid_name_createdat_idx
    on builds ("projectId", "compareScreenshotBucketId", "name", "createdAt" desc)
    include ("id", "prHeadCommit");
  `);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = async (knex) => {
  await knex.raw(`
    drop index concurrently if exists
      builds_projectid_name_createdat_idx;
  `);

  await knex.raw(`
    drop index concurrently if exists
      builds_projectid_prheadcommit_name_createdat_idx;
  `);

  await knex.raw(`
    drop index concurrently if exists
      builds_projectid_comparescreenshotbucketid_name_createdat_idx;
  `);
};

export const config = { transaction: false };
