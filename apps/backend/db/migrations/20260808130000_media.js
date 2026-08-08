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
 * `buildId` / `screenshotDiffId` are the seams for the later "link this media to
 * a diff" feature — nullable and unused for now, per the brief's non-goals.
 *
 * There is deliberately no processing state on this table. Argos stores exactly
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

    // The pull request this media was uploaded for, when the caller asked for a
    // managed comment. It is what the comment is keyed on: the comment lists
    // every media of a pull request, so a second upload edits the first comment
    // instead of appending another one.
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

    // Original file name, for display and for the Markdown alt text.
    table.string("name").notNullable();

    // Caller-provided stable identifier, unique per project. Re-uploading the
    // same slug replaces the bytes in place and keeps the id and the share
    // token, so a Markdown embed already posted to a pull request never goes
    // stale. Null means "a new media every time".
    table.string("slug");

    // Content-addressed CDN key: `media/<projectId>/<sha256>.<ext>`. Never
    // rewritten, so the same bytes always resolve to the same URL and the CDN
    // can cache it forever. Doubles as the "have I seen this file?" check.
    table.string("key").notNullable();
    table.string("mimeType").notNullable();
    table.bigInteger("sizeBytes").notNullable();

    // Images only, read from the file header at upload. Used to reserve the
    // frame's shape before the bytes arrive, so the share page doesn't reflow as
    // a large screenshot decodes. Videos size themselves in the player.
    table.integer("width");
    table.integer("height");

    table.string("visibility").notNullable().defaultTo("team");

    // Unguessable, and the only handle a share URL exposes. Separate from the
    // primary key so a share URL never leaks a sequential id, and so rotating
    // access doesn't mean re-uploading.
    table.string("shareToken").notNullable();

    // Null means "kept until deleted" — reserved for plans with configurable
    // retention that opt out of expiry entirely.
    table.dateTime("expiresAt");

    // Bytes have landed and the file has been checked, so the row is serveable.
    // A row is created before the upload (to sign it) so it starts null.
    table.dateTime("uploadedAt");

    // What this media charged the screenshot meter, frozen at upload time so a
    // later change to the conversion doesn't rewrite history.
    table.integer("billedUnits").notNullable().defaultTo(0);

    table.unique(["shareToken"]);

    // The media list: newest first, for one project.
    table.index(["projectId", "createdAt"]);

    // Rebuilding a pull request's managed comment reads every media on it.
    table.index(["githubPullRequestId"]);

    // The retention purge scans due rows across all projects.
    table.index(["expiresAt"]);
  });

  // A slug is unique per project only when it is set — a partial index, which
  // Knex's `unique()` cannot express.
  await knex.raw(`
    CREATE UNIQUE INDEX media_project_slug_unique
    ON media ("projectId", "slug")
    WHERE "slug" IS NOT NULL
  `);

  // The media meter sums units per project over a period, joined to the account
  // through the project. Partial, so rows whose upload never completed stay out
  // of the index and out of billing.
  await knex.raw(`
    CREATE INDEX media_project_uploaded_at_idx
    ON media ("projectId", "uploadedAt")
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
  await knex.schema.dropTable("media");
};
