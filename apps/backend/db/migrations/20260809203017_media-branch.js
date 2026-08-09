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
 * Every index here is built `CONCURRENTLY`, which Postgres refuses inside a
 * transaction — so the migration runs without one.
 *
 * `media` is on the upload path. Rebuilding its identity index the plain way
 * takes SHARE for the length of a full index build, and the `DROP` before it
 * takes ACCESS EXCLUSIVE, so every upload, finalize and delete would block until
 * both finished. The cost of running unwrapped is that a failure leaves the
 * schema half-applied *and* the migration unrecorded, so `up` has to be
 * re-runnable from the top. Every statement is written for that: columns are
 * added `IF NOT EXISTS`, and each index is dropped before it is built rather
 * than skipped when already present — a concurrent build that failed leaves an
 * *invalid* index under the right name, and skipping it would install something
 * that enforces nothing.
 */
export const config = { transaction: false };

/**
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  // Adding a nullable column rewrites nothing, so the brief ACCESS EXCLUSIVE
  // these take is the cheap part. `IF NOT EXISTS` — which knex's
  // `table.string(...)` does not emit — is what lets a re-run get past them.
  await knex.raw(
    `ALTER TABLE media ADD COLUMN IF NOT EXISTS branch varchar(255)`,
  );
  await knex.raw(
    `ALTER TABLE github_pull_requests ADD COLUMN IF NOT EXISTS "headRef" varchar(255)`,
  );
  // Whether the head branch lives in the base repository. Only a same-repo
  // branch belongs to the team; on a fork the name is chosen by whoever opened
  // the pull request, so it must never be used to claim their media.
  await knex.raw(
    `ALTER TABLE github_pull_requests ADD COLUMN IF NOT EXISTS "headFromFork" boolean`,
  );

  // The list filter: "what has been uploaded for this branch".
  await knex.raw(
    `DROP INDEX CONCURRENTLY IF EXISTS media_projectid_branch_index`,
  );
  await knex.raw(
    `CREATE INDEX CONCURRENTLY media_projectid_branch_index ON media ("projectId", branch)`,
  );

  // Publishing looks staged media up by (repository, branch) the moment a pull
  // request's data lands.
  await knex.raw(
    `DROP INDEX CONCURRENTLY IF EXISTS github_pull_requests_githubrepositoryid_headref_index`,
  );
  await knex.raw(
    `CREATE INDEX CONCURRENTLY github_pull_requests_githubrepositoryid_headref_index ON github_pull_requests ("githubRepositoryId", "headRef")`,
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
  // Built under a second name, then swapped: dropping the live one first would
  // leave a window with no uniqueness at all, and two concurrent uploads landing
  // in it create the duplicate the index exists to refuse.
  //
  // The leading drop is what makes the rebuild safe to retry. A concurrent build
  // that fails leaves its index present but `indisvalid = false` — enforcing
  // nothing — so skipping on name would rename that invalid index over the real
  // one, leaving a `media_identity_unique` that accepts duplicates and every
  // guard built on the violation quietly dead.
  await knex.raw(`DROP INDEX CONCURRENTLY IF EXISTS media_identity_unique_v2`);
  await knex.raw(`
    CREATE UNIQUE INDEX CONCURRENTLY media_identity_unique_v2
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

  await knex.raw(`DROP INDEX CONCURRENTLY IF EXISTS media_identity_unique_v1`);
  await knex.raw(`
    CREATE UNIQUE INDEX CONCURRENTLY media_identity_unique_v1
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

  await knex.raw(
    `ALTER TABLE github_pull_requests DROP COLUMN IF EXISTS "headFromFork"`,
  );
  await knex.raw(
    `ALTER TABLE github_pull_requests DROP COLUMN IF EXISTS "headRef"`,
  );
  await knex.raw(`ALTER TABLE media DROP COLUMN IF EXISTS branch`);
};
