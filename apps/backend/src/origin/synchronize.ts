import { transaction, type TransactionOrKnex } from "@/database";
import {
  OriginInstallation,
  OriginRepository,
  Project,
} from "@/database/models";
import parentLogger from "@/logger";
import { redisLock } from "@/util/redis";

import type { OriginApiInstallation, OriginApiRepository } from "./api";
import { getAppOriginApi, getInstallationOriginApi } from "./client";
import { checkOriginErrorStatus } from "./error";

const logger = parentLogger.child({ module: "origin/synchronize" });

/**
 * Create or update the local row of an installation from what Origin says
 * about it (install callback, webhook payload or app API).
 */
export async function upsertOriginInstallation(
  input: Pick<
    OriginApiInstallation,
    "id" | "target" | "repoSelectionMode" | "scopes"
  > & { deleted?: boolean },
): Promise<OriginInstallation> {
  const data = {
    originId: input.id,
    targetSlug: input.target.slug,
    targetId: input.target.id,
    repoSelectionMode: input.repoSelectionMode,
    scopes: input.scopes,
    deleted: input.deleted ?? false,
    ...(input.deleted ? { token: null, tokenExpiresAt: null } : {}),
  };
  const [installation] = await OriginInstallation.query()
    .insert([data])
    .onConflict("originId")
    .merge([
      "targetSlug",
      "targetId",
      "repoSelectionMode",
      "scopes",
      "deleted",
      "updatedAt",
      ...(input.deleted ? ["token", "tokenExpiresAt"] : []),
    ])
    .returning("*");
  if (!installation) {
    throw new Error("Failed to upsert Origin installation");
  }
  return installation;
}

/**
 * Reconcile `origin_repositories` with what the installation reaches.
 *
 * A repository lives in one namespace and a namespace holds one installation of
 * the app, so the installation that lists a repository is authoritative for it.
 * Repositories it stops listing — deselected, deleted, or the whole
 * installation removed — lose their installation, and the projects linked to
 * them are detached, as `linkInstallationRepositories` does for GitHub.
 *
 */
async function linkInstallationRepositories(
  installation: OriginInstallation,
  apiRepositories: OriginApiRepository[],
  trx: TransactionOrKnex,
) {
  if (apiRepositories.length > 0) {
    await OriginRepository.query(trx)
      .insert(
        apiRepositories.map((repo) => ({
          originId: repo.id,
          name: repo.name,
          ownerSlug: repo.owner.slug,
          ownerId: repo.owner.id,
          defaultBranch: repo.defaultBranch,
          originInstallationId: installation.id,
        })),
      )
      .onConflict("originId")
      .merge([
        "name",
        "ownerSlug",
        "ownerId",
        "defaultBranch",
        "originInstallationId",
        "updatedAt",
      ]);
  }

  const listedIds = apiRepositories.map((repo) => repo.id);
  const stale = await OriginRepository.query(trx)
    .where({ originInstallationId: installation.id })
    .whereNotIn("originId", listedIds.length > 0 ? listedIds : [""]);

  if (stale.length === 0) {
    return;
  }

  const staleIds = stale.map((repo) => repo.id);
  await Promise.all([
    OriginRepository.query(trx)
      .whereIn("id", staleIds)
      .patch({ originInstallationId: null }),
    Project.query(trx)
      .whereIn("originRepositoryId", staleIds)
      .patch({ originRepositoryId: null }),
  ]);
}

/**
 * Refresh an installation from Origin: its scopes and repository selection,
 * then the repositories it reaches.
 *
 * Runs under a lock per installation: the install callback and the
 * `installation.created` webhook both trigger it at the same moment.
 */
export async function synchronizeOriginInstallation(
  installationId: string,
): Promise<void> {
  await redisLock.acquire(
    ["synchronize-origin-installation", installationId],
    async () => {
      const installation = await OriginInstallation.query()
        .findById(installationId)
        .throwIfNotFound();

      const refreshed = await refreshInstallation(installation);
      const api = refreshed.deleted
        ? null
        : await getInstallationOriginApi(refreshed);

      const apiRepositories = api
        ? await api.listInstallationRepositories()
        : [];

      if (!api) {
        logger.info(
          { installationId, originId: refreshed.originId },
          "Origin installation is gone, detaching its repositories",
        );
      }

      await transaction(async (trx) => {
        await linkInstallationRepositories(refreshed, apiRepositories, trx);
      });
    },
    { timeout: 60_000 },
  );
}

/**
 * Re-read the installation's grant (scopes, repository selection) with the app
 * credentials. A 404 means the app was uninstalled.
 */
async function refreshInstallation(
  installation: OriginInstallation,
): Promise<OriginInstallation> {
  try {
    const remote = await getAppOriginApi().getAppInstallation(
      installation.originId,
    );
    return upsertOriginInstallation({ ...remote, deleted: false });
  } catch (error) {
    if (checkOriginErrorStatus(404, error)) {
      return installation.$query().patchAndFetch({
        deleted: true,
        token: null,
        tokenExpiresAt: null,
      });
    }
    throw error;
  }
}
