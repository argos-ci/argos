/**
 * Standalone media: an image or a video uploaded on its own, with no build and
 * no test run behind it. An agent records a Playwright video or takes a
 * screenshot, uploads it, and embeds the resulting share URL in the pull request
 * it just opened.
 *
 * Scoped to a **project**, exactly like a build. Everything else about Argos
 * hangs off a project — permissions, transfer, deletion, billing through the
 * account — so media gets all of it for free instead of needing an account-level
 * parallel for each. In particular `transferProject` moves a project's media and
 * its billing with it, which a denormalized `accountId` would have got wrong.
 *
 * Split in two, and the split is the point:
 *
 * - `media` is the **identity** — what the thing is a picture of. Its share token
 *   and therefore its URL never change.
 * - `media_versions` is one row per **upload**. Re-uploading the same thing adds a
 *   version instead of overwriting one.
 *
 * That is what makes the review loop work. A reviewer opens a share link, pins a
 * comment to a spot on the screenshot, the agent fixes the code and re-uploads;
 * the link in the pull request now shows the new screenshot, the comment thread is
 * still attached, and the version that was commented on is still there to compare
 * against. Overwriting in place would lose the before, and minting a new media
 * would lose the conversation.
 *
 * `buildId` / `screenshotDiffId` are the seams for the later "link this media to
 * a diff" feature — nullable and unused for now, per the brief's non-goals.
 *
 * There is deliberately no processing state on either table. Argos stores exactly
 * the bytes it was given and serves them through the image CDN, which derives
 * WebP/AVIF variants and video poster frames on request. So there is nothing to
 * transcode, nothing to extract, and no second object to keep in sync.
 *
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  await knex.schema.createTable("media", (table) => {
    table.bigIncrements("id").primary();
    table.dateTime("createdAt").notNullable();
    table.dateTime("updatedAt").notNullable();

    table.bigInteger("projectId").notNullable();
    table.foreign("projectId").references("projects.id").onDelete("cascade");

    // The pull request this media belongs to. Part of the media's identity: the
    // same screenshot name on two different pull requests is two different
    // things, while the same name on the same pull request is a new version of
    // one thing.
    table.bigInteger("githubPullRequestId");
    table
      .foreign("githubPullRequestId")
      .references("github_pull_requests.id")
      .onDelete("set null");

    // Seams for "link media to a build / to a diff". Nullable and unwritten in
    // v1; the columns exist so the feature doesn't need a migration on a table
    // that will be large by then.
    table.bigInteger("buildId");
    table.foreign("buildId").references("builds.id").onDelete("set null");
    table.bigInteger("screenshotDiffId");
    table
      .foreign("screenshotDiffId")
      .references("screenshot_diffs.id")
      .onDelete("set null");

    // Null when uploaded by a project token from CI: there is no acting user.
    table.bigInteger("createdByUserId");
    table
      .foreign("createdByUserId")
      .references("users.id")
      .onDelete("set null");

    // The file name, and the media's identity within its pull request. Also the
    // Markdown alt text. Re-uploading under the same name adds a version.
    table.string("name").notNullable();

    // `before` / `after`, so a pair can be shown side by side and compared. Part
    // of the identity: `checkout.png` before and `checkout.png` after are two
    // media, not two versions of one. Null for a media that is not half of a
    // pair.
    table.string("state");

    // Caller-supplied prose, rendered under the media in the managed pull
    // request comment. Belongs to the identity rather than the upload: it
    // describes what the reader is looking at, not which bytes arrived.
    table.text("description");

    table.string("visibility").notNullable().defaultTo("team");

    // Unguessable, and the only handle a share URL exposes. Separate from the
    // primary key so a share URL never leaks a sequential id — and stable across
    // versions, which is what lets a Markdown embed already posted to a pull
    // request show the newest screenshot without being rewritten.
    table.string("shareToken").notNullable();

    table.unique(["shareToken"]);

    // The media list: newest first, for one project.
    table.index(["projectId", "createdAt"]);

    // Rebuilding a pull request's managed comment reads every media on it, and
    // the pull request list groups by it.
    table.index(["githubPullRequestId"]);
  });

  await knex.raw(`
    ALTER TABLE media
    ADD CONSTRAINT media_state_check
    CHECK ("state" IS NULL OR "state" IN ('before', 'after'))
  `);

  // What makes a re-upload a new version rather than a new media. `COALESCE` is
  // load-bearing: Postgres treats NULLs as distinct in a unique index, so
  // without it two uploads with no pull request (or no state) would both insert
  // instead of stacking into versions. 0 is safe as the pull request sentinel
  // because `github_pull_requests.id` is a bigserial and never 0.
  await knex.raw(`
    CREATE UNIQUE INDEX media_identity_unique
    ON media (
      "projectId",
      (COALESCE("githubPullRequestId", 0)),
      "name",
      (COALESCE("state", ''))
    )
  `);

  await knex.schema.createTable("media_versions", (table) => {
    table.bigIncrements("id").primary();
    table.dateTime("createdAt").notNullable();
    table.dateTime("updatedAt").notNullable();

    table.bigInteger("mediaId").notNullable();
    table.foreign("mediaId").references("media.id").onDelete("cascade");

    // 1-based, and what the UI calls the version. Assigned by counting the
    // media's existing versions under a lock, not by a global sequence: "v3" has
    // to mean the third upload of *this* media.
    table.integer("number").notNullable();

    // Null when uploaded by a project token from CI: there is no acting user.
    table.bigInteger("createdByUserId");
    table
      .foreign("createdByUserId")
      .references("users.id")
      .onDelete("set null");

    // Content-addressed CDN key: `media/<projectId>/<sha256>.<ext>`. Never
    // rewritten, so the same bytes always resolve to the same URL and the CDN
    // can cache it forever. Doubles as the "have I seen this file?" check — and
    // because two versions of the same media can share a key, deleting an object
    // has to check no other version still points at it.
    table.string("key").notNullable();
    table.string("mimeType").notNullable();
    table.bigInteger("sizeBytes").notNullable();

    // Images only, read from the file header at upload. Used to reserve the
    // frame's shape before the bytes arrive, so the share page doesn't reflow as
    // a large screenshot decodes. Videos size themselves in the player.
    table.integer("width");
    table.integer("height");

    // Retention applies to stored bytes, so it lives on the version. An old
    // version expires and is purged while the media and its newest version live
    // on. Null means "kept until deleted".
    table.dateTime("expiresAt");

    // Bytes have landed and the file has been checked, so the row is serveable.
    // A row is created before the upload (to sign it) so it starts null.
    table.dateTime("uploadedAt");

    // What this upload charged the screenshot meter, frozen at upload time so a
    // later change to the conversion doesn't rewrite history.
    table.integer("billedUnits").notNullable().defaultTo(0);

    table.unique(["mediaId", "number"]);

    // The retention purge scans due rows across all projects.
    table.index(["expiresAt"]);
  });

  // "The latest version of this media", which every read path needs: the share
  // page, the managed comment, and the pull request list. Descending so the
  // newest is the first row for each media.
  await knex.raw(`
    CREATE INDEX media_versions_media_number_idx
    ON media_versions ("mediaId", "number" DESC)
  `);

  // The media meter sums units per version over a period, joined to the account
  // through the media's project. Partial, so uploads that never completed stay
  // out of the index and out of billing.
  await knex.raw(`
    CREATE INDEX media_versions_uploaded_at_idx
    ON media_versions ("uploadedAt")
    WHERE "uploadedAt" IS NOT NULL
  `);

  // The managed pull request comment listing a PR's media is a *second* comment,
  // separate from the Argos build-status one: standalone media has no build
  // behind it, and folding the two would mean rewriting a build comment from a
  // path that knows nothing about builds.
  await knex.schema.alterTable("github_pull_requests", (table) => {
    table.string("mediaCommentId");
    table.boolean("mediaCommentDeleted").notNullable().defaultTo(false);
  });
};

/**
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.schema.alterTable("github_pull_requests", (table) => {
    table.dropColumn("mediaCommentId");
    table.dropColumn("mediaCommentDeleted");
  });
  await knex.schema.dropTable("media_versions");
  await knex.schema.dropTable("media");
};
