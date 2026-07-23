import { invariant } from "@argos/util/invariant";
import type { RestEndpointMethodTypes } from "@octokit/rest";

import { transaction, TransactionOrKnex } from "@/database";
import {
  GithubAccount,
  GithubInstallation,
  GithubRepository,
  GithubRepositoryInstallation,
  Project,
} from "@/database/models";
import { getAppOctokit, getInstallationOctokit } from "@/github";
import { HTTPError } from "@/util/error";

type ApiRepository =
  RestEndpointMethodTypes["apps"]["listReposAccessibleToInstallation"]["response"]["data"]["repositories"][0];

type SyncCtx = {
  installation: GithubInstallation;
  octokit: Exclude<Awaited<ReturnType<typeof getInstallationOctokit>>, null>;
};

/**
 * Reconcile the repositories linked to an installation.
 *
 * A repository belongs to a single GitHub account, and an account has a single
 * installation per app (`main` / `light`). The installation we just synced
 * listed its repositories through the GitHub API, so for those repositories it
 * is the authoritative installation: any link held by another installation of
 * the same app is stale and gets evicted. This is what keeps a repository from
 * ending up with two active installations after it is transferred to another
 * account or the app is uninstalled and reinstalled (getting a new GitHub id).
 *
 * Exported for testing.
 */
export async function linkInstallationRepositories(
  installation: GithubInstallation,
  repositories: GithubRepository[],
  trx: TransactionOrKnex,
) {
  const installationId = installation.id;
  const repositoryIds = repositories.map((repository) => repository.id);

  const links = await GithubRepositoryInstallation.query(trx).where({
    githubInstallationId: installationId,
  });

  const toLink = repositories.filter(
    (repository) =>
      !links.some(
        ({ githubRepositoryId }) => githubRepositoryId === repository.id,
      ),
  );

  const toUnlink = links.filter(
    (link) =>
      !repositories.some(
        (repository) => repository.id === link.githubRepositoryId,
      ),
  );

  await Promise.all([
    // Link repositories accessible to this installation.
    toLink.length > 0
      ? GithubRepositoryInstallation.query(trx).insert(
          toLink.map((repository) => ({
            githubInstallationId: installationId,
            githubRepositoryId: repository.id,
          })),
        )
      : null,
    // Unlink repositories no longer accessible to this installation.
    toUnlink.length > 0
      ? GithubRepositoryInstallation.query(trx)
          .whereIn(
            "id",
            toUnlink.map((link) => link.id),
          )
          .delete()
      : null,
    // Evict stale links held by another installation of the same app: a
    // repository can only be served by a single active installation per app.
    repositoryIds.length > 0
      ? GithubRepositoryInstallation.query(trx)
          .whereIn("githubRepositoryId", repositoryIds)
          .whereNot("githubInstallationId", installationId)
          .whereIn(
            "githubInstallationId",
            GithubInstallation.query(trx)
              .select("id")
              .where({ app: installation.app }),
          )
          .delete()
      : null,
  ]);

  // Detach projects whose repository is no longer served by any active
  // installation. We recompute this after the mutations above, because a
  // repository dropped by this installation may still be served by another one
  // (e.g. the `main` + `light` pair, or a newer installation), in which case
  // the project must stay linked.
  if (toUnlink.length > 0) {
    const droppedRepositoryIds = toUnlink.map(
      ({ githubRepositoryId }) => githubRepositoryId,
    );
    const stillLinkedRows = await GithubRepositoryInstallation.query(trx)
      .whereIn("githubRepositoryId", droppedRepositoryIds)
      .whereIn(
        "githubInstallationId",
        GithubInstallation.query(trx).select("id").where({ deleted: false }),
      )
      .select("githubRepositoryId");
    const stillLinked = new Set(
      stillLinkedRows.map((row) => row.githubRepositoryId),
    );
    const orphanRepositoryIds = droppedRepositoryIds.filter(
      (id) => !stillLinked.has(id),
    );
    if (orphanRepositoryIds.length > 0) {
      await Project.query(trx)
        .whereIn("githubRepositoryId", orphanRepositoryIds)
        .patch({ githubRepositoryId: null });
    }
  }
}

function extractOwnersFromRepositories(repositories: ApiRepository[]) {
  return repositories.reduce(
    (owners, repo) => {
      const exist = owners.some(({ id }) => id === repo.owner.id);

      if (!exist) {
        const lowerType = repo.owner.type.toLowerCase();
        invariant(
          lowerType === "organization" || lowerType === "user",
          `unexpected owner type ${repo.owner.type} for repository ${repo.id}`,
        );

        owners.push({
          id: repo.owner.id,
          name: repo.owner.name ?? null,
          login: repo.owner.login,
          type: lowerType,
        });
      }

      return owners;
    },
    [] as {
      id: number;
      name: string | null;
      login: string;
      type: "user" | "organization";
    }[],
  );
}

async function saveAccounts(
  repositories: ApiRepository[],
  trx: TransactionOrKnex,
) {
  const owners = extractOwnersFromRepositories(repositories);
  const existingAccounts = owners.length
    ? await GithubAccount.query(trx).whereIn(
        "githubId",
        owners.map(({ id }) => id),
      )
    : [];

  const [toInsert, toUpdate] = owners.reduce(
    ([toInsert, toUpdate], owner) => {
      const exist = existingAccounts.some(
        ({ githubId }) => githubId === owner.id,
      );
      if (exist) {
        toUpdate.push(owner);
      } else {
        toInsert.push(owner);
      }
      return [toInsert, toUpdate];
    },
    [[], []] as [typeof owners, typeof owners],
  );

  await Promise.all([
    toInsert.length > 0
      ? GithubAccount.query(trx).insert(
          toInsert.map((owner) => ({
            githubId: owner.id,
            name: owner.name,
            login: owner.login,
            type: owner.type,
          })),
        )
      : null,
    ...toUpdate.map((owner) =>
      GithubAccount.query(trx)
        .patch({
          name: owner.name,
          login: owner.login,
          type: owner.type,
        })
        .where({ githubId: owner.id }),
    ),
  ]);

  return owners.length
    ? GithubAccount.query(trx).whereIn(
        "githubId",
        owners.map(({ id }) => id),
      )
    : ([] as GithubAccount[]);
}

async function saveRepositories(
  accounts: GithubAccount[],
  apiRepositories: ApiRepository[],
  trx: TransactionOrKnex,
) {
  const existingRepositories = apiRepositories.length
    ? await GithubRepository.query(trx).whereIn(
        "githubId",
        apiRepositories.map(({ id }) => id),
      )
    : [];

  const [toInsert, toUpdate] = apiRepositories.reduce(
    ([toInsert, toUpdate], apiRepo) => {
      const exist = existingRepositories.some(
        ({ githubId }) => githubId === apiRepo.id,
      );
      if (exist) {
        toUpdate.push(apiRepo);
      } else {
        toInsert.push(apiRepo);
      }
      return [toInsert, toUpdate];
    },
    [[], []] as [typeof apiRepositories, typeof apiRepositories],
  );

  const getRepoData = (apiRepo: ApiRepository) => {
    const githubAccountId = accounts.find(
      ({ githubId }) => githubId === apiRepo.owner.id,
    )?.id;

    invariant(
      githubAccountId,
      `cannot find account ${apiRepo.owner.id} for repository ${apiRepo.id}`,
    );

    return {
      githubId: apiRepo.id,
      name: apiRepo.name,
      private: apiRepo.private,
      defaultBranch: apiRepo.default_branch,
      githubAccountId,
    };
  };

  await Promise.all([
    toInsert.length > 0
      ? GithubRepository.query(trx).insert(
          toInsert.map((apiRepo) => getRepoData(apiRepo)),
        )
      : null,
    ...toUpdate.map((apiRepo) =>
      GithubRepository.query(trx)
        .patch(getRepoData(apiRepo))
        .where({ githubId: apiRepo.id }),
    ),
  ]);

  return apiRepositories.length
    ? GithubRepository.query(trx).whereIn(
        "githubId",
        apiRepositories.map(({ id }) => id),
      )
    : ([] as GithubRepository[]);
}

async function getRepositories(ctx: SyncCtx): Promise<ApiRepository[]> {
  try {
    return (await ctx.octokit.paginate(
      ctx.octokit.apps.listReposAccessibleToInstallation,
      { installation_id: ctx.installation.githubId },
    )) as unknown as ApiRepository[];
  } catch (error: any) {
    if (error.response.status === 404 || error.response.status === 401) {
      return [];
    }
    throw error;
  }
}

export async function synchronizeInstallation(installationId: string) {
  const installation = await GithubInstallation.query()
    .findById(installationId)
    .throwIfNotFound();

  const appOctokit = getAppOctokit({
    app: installation.app,
    proxy: installation.proxy,
  });

  const octokit = await getInstallationOctokit(installation, appOctokit).catch(
    (error) => {
      if (
        error instanceof HTTPError &&
        error.code === "GITHUB_INSTALLATION_SUSPENDED"
      ) {
        return error.code;
      }
      throw error;
    },
  );

  // If the installation is suspended, skip synchronization.
  if (octokit === "GITHUB_INSTALLATION_SUSPENDED") {
    return;
  }

  // If we don't get an octokit, then the installation has been removed
  // we delete the installation
  if (!octokit) {
    await transaction(async (trx) => {
      await linkInstallationRepositories(installation, [], trx);
    });
    return;
  }

  const ctx: SyncCtx = {
    octokit,
    installation,
  };

  const apiRepositories = await getRepositories(ctx);

  await transaction(async (trx) => {
    const accounts = await saveAccounts(apiRepositories, trx);
    const repositories = await saveRepositories(accounts, apiRepositories, trx);
    await linkInstallationRepositories(installation, repositories, trx);
  });
}
