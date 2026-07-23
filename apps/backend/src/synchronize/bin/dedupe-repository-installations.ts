#!/usr/bin/env node
/**
 * One-off cleanup for repositories linked to more than one active GitHub
 * installation of the same app (`main` / `light`).
 *
 * This can happen when a repository is transferred to another account, or when
 * the app is uninstalled and reinstalled (getting a new GitHub installation id),
 * before the old installation is cleaned up. For each affected repository we ask
 * GitHub which installation still has access and drop the stale link(s).
 *
 * Usage (from apps/backend, after building):
 *   node dist/synchronize/bin/dedupe-repository-installations.js           # dry-run
 *   node dist/synchronize/bin/dedupe-repository-installations.js --apply   # delete stale links
 *
 * Dry-run never deletes links. It may still mark an installation GitHub reports
 * as removed (404) as `deleted` — that is a safe, correct state fix.
 */
import { callbackify } from "node:util";

import { knex } from "@/database";
import {
  GithubInstallation,
  GithubRepository,
  GithubRepositoryInstallation,
} from "@/database/models";
import { getInstallationOctokit } from "@/github";
import logger from "@/logger";
import { HTTPError } from "@/util/error";

const APPLY = process.argv.includes("--apply");

type DuplicateGroup = {
  githubRepositoryId: string;
  app: string;
  installationIds: string[];
};

/**
 * Repositories linked to more than one active installation of the same app.
 * Uses DISTINCT so exact-duplicate rows (same repo + same installation) do not
 * count as multiple installations — those are handled by the unique index.
 */
async function findDuplicateGroups(): Promise<DuplicateGroup[]> {
  const { rows } = await knex.raw(`
    SELECT
      gri."githubRepositoryId" AS "githubRepositoryId",
      gi.app AS app,
      array_agg(DISTINCT gi.id) AS "installationIds"
    FROM github_repository_installations gri
    JOIN github_installations gi ON gi.id = gri."githubInstallationId"
    WHERE gi.deleted = false
    GROUP BY gri."githubRepositoryId", gi.app
    HAVING count(DISTINCT gi.id) > 1
    ORDER BY gri."githubRepositoryId"
  `);
  return rows.map(
    (row: {
      githubRepositoryId: string | number;
      app: string;
      installationIds: (string | number)[];
    }) => ({
      githubRepositoryId: String(row.githubRepositoryId),
      app: row.app,
      installationIds: row.installationIds.map((id) => String(id)),
    }),
  );
}

type Access = "yes" | "no" | "unknown";

// installation.id -> set of accessible repository githubIds, or null when the
// access could not be verified (e.g. suspended installation).
const accessibleReposCache = new Map<string, Set<number> | null>();

/**
 * Whether an installation still has access to a repository on GitHub.
 * - "yes": the repository is in the installation's accessible list.
 * - "no": the installation is gone, or no longer has the repository.
 * - "unknown": we could not verify — never delete in this case.
 */
async function getInstallationAccess(
  installation: GithubInstallation,
  repositoryGithubId: number,
): Promise<Access> {
  if (!accessibleReposCache.has(installation.id)) {
    let octokit;
    try {
      octokit = await getInstallationOctokit(installation);
    } catch (error) {
      if (
        error instanceof HTTPError &&
        error.code === "GITHUB_INSTALLATION_SUSPENDED"
      ) {
        accessibleReposCache.set(installation.id, null);
        return "unknown";
      }
      throw error;
    }
    if (!octokit) {
      // Installation removed on GitHub: it no longer has any repository.
      accessibleReposCache.set(installation.id, new Set());
    } else {
      const repositories = (await octokit.paginate(
        octokit.apps.listReposAccessibleToInstallation,
        { installation_id: installation.githubId },
      )) as { id: number }[];
      accessibleReposCache.set(
        installation.id,
        new Set(repositories.map((repo) => repo.id)),
      );
    }
  }
  const accessible = accessibleReposCache.get(installation.id);
  if (!accessible) {
    return "unknown";
  }
  return accessible.has(repositoryGithubId) ? "yes" : "no";
}

const main = callbackify(async () => {
  const groups = await findDuplicateGroups();
  logger.info(
    `Found ${groups.length} repository/app group(s) with multiple active installations`,
  );

  let removedLinks = 0;
  let skippedGroups = 0;

  for (const group of groups) {
    const repository = await GithubRepository.query().findById(
      group.githubRepositoryId,
    );
    if (!repository) {
      logger.warn(`Repository ${group.githubRepositoryId} not found, skipping`);
      skippedGroups += 1;
      continue;
    }

    const installations = await GithubInstallation.query().whereIn(
      "id",
      group.installationIds,
    );

    const evaluated = await Promise.all(
      installations.map(async (installation) => ({
        installation,
        access: await getInstallationAccess(installation, repository.githubId),
      })),
    );

    const label = `repo githubId=${repository.githubId} (${repository.name}) app=${group.app}`;

    if (evaluated.some((entry) => entry.access === "unknown")) {
      logger.warn(
        `[skip] ${label}: at least one installation could not be verified (suspended?). Resolve manually.`,
      );
      skippedGroups += 1;
      continue;
    }

    const keepers = evaluated.filter((entry) => entry.access === "yes");
    const stale = evaluated.filter((entry) => entry.access === "no");

    if (keepers.length !== 1 || stale.length === 0) {
      logger.warn(
        `[skip] ${label}: ${keepers.length} installation(s) still have access ` +
          `(${keepers.map((k) => k.installation.githubId).join(", ") || "none"}), ` +
          `${stale.length} stale. Resolve manually.`,
      );
      skippedGroups += 1;
      continue;
    }

    const keeper = keepers[0]!.installation;
    const staleInstallationIds = stale.map((entry) => entry.installation.id);

    const staleLinks = await GithubRepositoryInstallation.query()
      .where({ githubRepositoryId: repository.id })
      .whereIn("githubInstallationId", staleInstallationIds);

    logger.info(
      `[${APPLY ? "apply" : "dry-run"}] ${label}: keep installation githubId=${keeper.githubId}, ` +
        `remove ${staleLinks.length} stale link(s) to installation(s) githubId=${stale
          .map((s) => s.installation.githubId)
          .join(", ")}`,
    );

    if (APPLY && staleLinks.length > 0) {
      await GithubRepositoryInstallation.query()
        .whereIn(
          "id",
          staleLinks.map((link) => link.id),
        )
        .delete();
      removedLinks += staleLinks.length;
    }
  }

  logger.info(
    APPLY
      ? `Done. Removed ${removedLinks} stale link(s); skipped ${skippedGroups} group(s) for manual review.`
      : `Dry-run complete; skipped ${skippedGroups} group(s) needing manual review. Re-run with --apply to remove stale links.`,
  );

  await knex.destroy();
});

main((err) => {
  if (err) {
    throw err;
  }
});
