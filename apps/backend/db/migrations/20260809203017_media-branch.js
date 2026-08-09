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
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.schema.alterTable("media", (table) => {
    table.string("branch");
    // The list filter: "what has been uploaded for this branch".
    table.index(["projectId", "branch"]);
  });

  await knex.schema.alterTable("github_pull_requests", (table) => {
    table.string("headRef");
    // Publishing looks staged media up by (repository, branch) the moment a
    // pull request's data lands.
    table.index(["githubRepositoryId", "headRef"]);
  });

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
  await knex.raw(`DROP INDEX media_identity_unique`);
  await knex.raw(`
    CREATE UNIQUE INDEX media_identity_unique
    ON media (
      "projectId",
      COALESCE("githubPullRequestId", 0),
      (CASE WHEN "githubPullRequestId" IS NULL THEN COALESCE(branch, '') ELSE '' END),
      name,
      COALESCE(state, '')
    )
  `);
};

/**
 * Drops the branch, so staged media lose the only thing attaching them to
 * anything. They stay as media with no pull request — the state an unattached upload was
 * already in before this — rather than being deleted.
 *
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.raw(`DROP INDEX media_identity_unique`);

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
    CREATE UNIQUE INDEX media_identity_unique
    ON media (
      "projectId",
      COALESCE("githubPullRequestId", 0),
      name,
      COALESCE(state, '')
    )
  `);

  await knex.schema.alterTable("github_pull_requests", (table) => {
    table.dropColumn("headRef");
  });

  await knex.schema.alterTable("media", (table) => {
    table.dropColumn("branch");
  });
};
