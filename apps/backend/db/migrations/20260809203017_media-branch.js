/**
 * Let a media be uploaded against a **branch**, before any pull request exists.
 *
 * An agent doing work produces screenshots while it is still on a branch — the
 * pull request comes after, if it comes at all. Making the pull request the only
 * thing a media can be attached to forced the ordering the other way round, so
 * the uploads either had to wait or land unattached and stay that way. A media on
 * a branch is *staged*: it is real, it has a share URL, and it is waiting for a
 * pull request to publish it to.
 *
 * `headRef` on the pull request is the other half. It is the branch a pull request
 * is *from*, which Argos never stored — only `baseRef`, the branch it merges
 * into. Publishing a branch's staged media when its pull request opens is a lookup
 * on that column, so without it there is nothing to match on.
 *
/**
 * Every index here is built `CONCURRENTLY`, which Postgres refuses inside a
 * transaction — so the migration runs without one.
 *
 * `media` is on the upload path. Rebuilding its identity index the plain way
 * takes SHARE for the length of a full index build, and the `DROP` before it
 * takes ACCESS EXCLUSIVE, so every upload, finalize and delete would block until
 * both finished. The cost of running unwrapped is that a failure leaves the
 * schema half-applied; re-running `up` is safe, since each statement is
 * idempotent or names a distinct index.
 */
export const config = { transaction: false };

/**
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  // Adding a nullable varchar rewrites nothing, so the brief ACCESS EXCLUSIVE
  // these take is the cheap part.
  await knex.schema.alterTable("media", (table) => {
    table.string("branch");
  });

  await knex.schema.alterTable("github_pull_requests", (table) => {
    table.string("headRef");
  });

  // The list filter: "what has been uploaded for this branch".
  await knex.raw(
    `CREATE INDEX CONCURRENTLY IF NOT EXISTS media_projectid_branch_index ON media ("projectId", branch)`,
  );

  // Publishing looks staged media up by (repository, branch) the moment a pull
  // request's data lands.
  await knex.raw(
    `CREATE INDEX CONCURRENTLY IF NOT EXISTS github_pull_requests_githubrepositoryid_headref_index ON github_pull_requests ("githubRepositoryId", "headRef")`,
  );

  // Identity becomes "(project, whatever this media is attached to, name,
  // state)", where the attachment is the pull request when there is one and the
  // branch otherwise.
  //
  // The `CASE` is what lets staged media publish without changing identity. It
  // keeps its branch after the pull request is attached — it is worth knowing
  // where it came from — but the branch stops counting the moment there is a
  // pull request. Without that, `checkout.png` uploaded to branch `feat/x` and
  // then re-uploaded with `prNumber` would read as two different media and the
  // second upload would create one instead of adding a version to the first.
  //
  // Built under a second name, then swapped: dropping first would leave a window
  // with no uniqueness at all, and two concurrent uploads landing in it create
  // the duplicate the index exists to refuse.
  await knex.raw(`
    CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS media_identity_unique_v2
    ON media (
      "projectId",
      COALESCE("githubPullRequestId", 0),
      (CASE WHEN "githubPullRequestId" IS NULL THEN COALESCE(branch, '') ELSE '' END),
      name,
      COALESCE(state, '')
    )
  `);
  await knex.raw(`DROP INDEX CONCURRENTLY IF EXISTS media_identity_unique`);
  await knex.raw(
    `ALTER INDEX media_identity_unique_v2 RENAME TO media_identity_unique`,
  );
};

/**
 * Drops the branch, so staged media lose the only thing attaching them to
 * anything. They stay as media with no pull request — the state an unattached upload was
 * already in before this — rather than being deleted.
 *
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  // Two staged media on different branches can share a name, which the restored
  // index has no room for. Keep the oldest of each colliding group so the index
  // can be rebuilt; the rest were only distinguishable by the column being
  // dropped.
  //
  // Deliberately not filtered on `branch IS NOT NULL`: a group can collide
  // because one row has a branch and a *newer* one does not, and skipping the
  // branchless row leaves both behind — the unique index then fails to build and
  // the rollback aborts halfway, with the table left carrying no identity index
  // at all. Membership of the group is what decides, not how the row got there.
  await knex.raw(`
    DELETE FROM media
    WHERE "githubPullRequestId" IS NULL
      AND id NOT IN (
        SELECT min(id) FROM media
        WHERE "githubPullRequestId" IS NULL
        GROUP BY "projectId", name, COALESCE(state, '')
      )
  `);

  await knex.raw(`
    CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS media_identity_unique_v1
    ON media (
      "projectId",
      COALESCE("githubPullRequestId", 0),
      name,
      COALESCE(state, '')
    )
  `);
  await knex.raw(`DROP INDEX CONCURRENTLY IF EXISTS media_identity_unique`);
  await knex.raw(
    `ALTER INDEX media_identity_unique_v1 RENAME TO media_identity_unique`,
  );

  await knex.schema.alterTable("github_pull_requests", (table) => {
    table.dropColumn("headRef");
  });

  await knex.schema.alterTable("media", (table) => {
    table.dropColumn("branch");
  });
};
