const GITLAB_COM_URL = "https://gitlab.com";

/**
 * A `gitlabId` is only unique within the GitLab instance that issued it: every
 * self-hosted instance numbers its projects and users from 1, as gitlab.com
 * does. Looked up by `gitlabId` alone, a self-hosted project #42 was bound to
 * the row of gitlab.com's #42 — its name, path and visibility, which a project
 * without an explicit `private` setting takes its own visibility from — and
 * every build re-synced that shared row from whichever instance it ran against.
 *
 * @param {import('knex').Knex} knex
 */
export const up = async (knex) => {
  // Without it, every `gitlab_projects` row deleted below scans `projects` for
  // the foreign key check.
  await knex.schema.alterTable("projects", (table) => {
    table.index("gitlabProjectId");
  });

  await knex.schema.alterTable("gitlab_projects", (table) => {
    table.string("baseUrl");
  });

  // An instance is only known through the accounts linking a row; one nothing
  // links is a cache entry with no way to tell where it came from.
  await knex.raw(`
    DELETE FROM gitlab_projects g
    WHERE NOT EXISTS (SELECT 1 FROM projects p WHERE p."gitlabProjectId" = g.id)
  `);

  // A row belongs to the instance of the account that linked it first.
  await knex.raw(
    `
    UPDATE gitlab_projects g
    SET "baseUrl" = first."baseUrl"
    FROM (
      SELECT DISTINCT ON (p."gitlabProjectId")
        p."gitlabProjectId" AS id,
        coalesce(a."gitlabBaseUrl", ?) AS "baseUrl"
      FROM projects p
      JOIN accounts a ON a.id = p."accountId"
      WHERE p."gitlabProjectId" IS NOT NULL
      ORDER BY p."gitlabProjectId", p."createdAt", p.id
    ) first
    WHERE g.id = first.id
  `,
    [GITLAB_COM_URL],
  );

  // Projects from other instances sharing that row get a copy of their own.
  const { rows: moves } = await knex.raw(
    `
    SELECT
      p."gitlabProjectId" AS id,
      coalesce(a."gitlabBaseUrl", ?) AS "baseUrl",
      array_agg(p.id) AS "projectIds"
    FROM projects p
    JOIN accounts a ON a.id = p."accountId"
    JOIN gitlab_projects g ON g.id = p."gitlabProjectId"
    WHERE coalesce(a."gitlabBaseUrl", ?) <> g."baseUrl"
    GROUP BY 1, 2
  `,
    [GITLAB_COM_URL, GITLAB_COM_URL],
  );

  const splitIds = new Set();
  for (const move of moves) {
    const {
      rows: [copy],
    } = await knex.raw(
      `
      INSERT INTO gitlab_projects
        ("createdAt", "updatedAt", name, path, "pathWithNamespace", visibility, "defaultBranch", "gitlabId", "baseUrl")
      SELECT "createdAt", "updatedAt", name, path, "pathWithNamespace", visibility, "defaultBranch", "gitlabId", ?
      FROM gitlab_projects
      WHERE id = ?
      RETURNING id
    `,
      [move.baseUrl, move.id],
    );
    await knex("projects")
      .whereIn("id", move.projectIds)
      .update({ gitlabProjectId: copy.id });
    splitIds.add(move.id);
    splitIds.add(copy.id);
  }

  // A shared row holds whatever instance synced it last, so its visibility may
  // be another project's: fail closed until it is synced again. Marking it
  // stale is what makes the next build, or `gitlab/bin/sync-gitlab-projects`
  // right after deploy, sync it.
  if (splitIds.size > 0) {
    await knex("gitlab_projects")
      .whereIn("id", [...splitIds])
      .update({ visibility: "private", updatedAt: new Date(0).toISOString() });
  }

  await dedupe(knex, "gitlab_projects", "projects", "gitlabProjectId", {
    detach: false,
  });

  await knex.raw(
    `ALTER TABLE gitlab_projects ALTER COLUMN "baseUrl" SET NOT NULL`,
  );
  await knex.schema.alterTable("gitlab_projects", (table) => {
    table.unique(["baseUrl", "gitlabId"]);
  });

  // Sign-in with GitLab only goes through gitlab.com.
  await knex.schema.alterTable("gitlab_users", (table) => {
    table.string("baseUrl").notNullable().defaultTo(GITLAB_COM_URL);
  });
  await knex.raw(
    `ALTER TABLE gitlab_users ALTER COLUMN "baseUrl" DROP DEFAULT`,
  );

  // Two users can't share one GitLab user: signing in resolves only one of
  // them, and deleting either account deletes the row the other references.
  await dedupe(knex, "gitlab_users", "users", "gitlabUserId", { detach: true });

  await knex.schema.alterTable("gitlab_users", (table) => {
    table.unique(["baseUrl", "gitlabId"]);
  });
};

/**
 * Nothing prevented two concurrent requests from both inserting a row: keep the
 * oldest of each instance and `gitlabId` that something references, and either
 * point what referenced the others at it or, with `detach`, unlink it.
 *
 * @param {import('knex').Knex} knex
 * @param {string} table
 * @param {string} refTable
 * @param {string} refColumn
 * @param {{ detach: boolean }} options
 */
async function dedupe(knex, table, refTable, refColumn, { detach }) {
  const duplicates = `
    SELECT dup.id, first_value(dup.id) OVER (
      PARTITION BY dup."baseUrl", dup."gitlabId"
      ORDER BY NOT EXISTS (
        SELECT 1 FROM ${refTable} ref WHERE ref."${refColumn}" = dup.id
      ), dup.id
    ) AS "keepId"
    FROM ${table} dup
  `;
  await knex.raw(`
    UPDATE ${refTable} r
    SET "${refColumn}" = ${detach ? "NULL" : `d."keepId"`}
    FROM (${duplicates}) d
    WHERE r."${refColumn}" = d.id AND d.id <> d."keepId"
  `);
  await knex.raw(`
    DELETE FROM ${table} t
    USING (${duplicates}) d
    WHERE t.id = d.id AND d.id <> d."keepId"
  `);
}

/**
 * Rows split per instance stay split: each is a valid row on its own.
 *
 * @param {import('knex').Knex} knex
 */
export const down = async (knex) => {
  await knex.schema.alterTable("gitlab_users", (table) => {
    table.dropColumn("baseUrl");
  });
  await knex.schema.alterTable("gitlab_projects", (table) => {
    table.dropColumn("baseUrl");
  });
  await knex.schema.alterTable("projects", (table) => {
    table.dropIndex("gitlabProjectId");
  });
};
