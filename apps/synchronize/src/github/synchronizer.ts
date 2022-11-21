/* eslint-disable no-await-in-loop */
import type { Octokit } from "@octokit/rest";

import config from "@argos-ci/config";
import {
  Account,
  Installation,
  InstallationRepositoryRight,
  Organization,
  Repository,
  User,
  UserInstallationRight,
  UserOrganizationRight,
  UserRepositoryRight,
} from "@argos-ci/database/models";
import type { Synchronization } from "@argos-ci/database/models";
import {
  getAppOctokit,
  getInstallationOctokit,
  getOAuthOctokit,
  getTokenOctokit,
} from "@argos-ci/github";

import { cancelPurchase } from "./eventHelpers.js";
import type { GitHubRepository } from "./types.js";
import { updatePurchase } from "./updatePurchase.js";

export const getOrCreateInstallation = async ({
  githubId,
  deleted = false,
}: {
  githubId: number;
  deleted?: boolean;
}) => {
  const data = { githubId, deleted };
  const installation = await Installation.query().findOne({ githubId });
  if (installation) {
    if (installation.deleted !== deleted) {
      return Installation.query().patchAndFetchById(installation.id, data);
    }
    return installation;
  }
  return Installation.query().insertAndFetch(data);
};

const checkAccessTokenValidity = async (accessToken: string) => {
  const oauthOctokit = getOAuthOctokit();
  try {
    await oauthOctokit.apps.checkToken({
      access_token: accessToken,
      client_id: config.get("github.clientId"),
    });
  } catch (error: any) {
    if (error.status === 404) {
      return false;
    }

    throw error;
  }

  return true;
};

const OWNER_ORGANIZATION = "Organization";
const OWNER_USER = "User";

export class GitHubSynchronizer {
  synchronization: Synchronization;
  repositories: Repository[];
  organizationIds: string[];
  octokit!: Octokit;
  appOctokit!: Octokit;

  constructor(synchronization: Synchronization) {
    this.synchronization = synchronization;
    this.repositories = [];
    this.organizationIds = [];
  }

  async synchronizeAppRepositories(installationId: string) {
    const githubRepositories = (await this.octokit.paginate(
      this.octokit.apps.listReposAccessibleToInstallation
    )) as unknown as GitHubRepository[];
    const { repositories, organizations } = await this.synchronizeRepositories(
      githubRepositories
    );

    await this.synchronizeInstallationRepositoryRights(
      repositories,
      installationId
    );

    return { repositories, organizations };
  }

  async getInstallationRepositories(installationId: number) {
    try {
      return (await this.octokit.paginate(
        this.octokit.apps.listInstallationReposForAuthenticatedUser,
        { installation_id: installationId }
      )) as unknown as GitHubRepository[];
    } catch (error: any) {
      if (error.response.status === 404) return [];
      throw error;
    }
  }

  async synchronizeUserInstallationRepositories(installation: Installation) {
    const githubRepositories = await this.getInstallationRepositories(
      installation.githubId
    );
    const { repositories, organizations } = await this.synchronizeRepositories(
      githubRepositories
    );

    await this.synchronizeInstallationRepositoryRights(
      repositories,
      installation.id
    );

    return { repositories, organizations };
  }

  async synchronizeRepositories(githubRepositories: GitHubRepository[]) {
    const [
      {
        owners: organizations,
        ownerIdByRepositoryId: organizationIdByRepositoryId,
      },
      { ownerIdByRepositoryId: userIdByRepositoryId },
    ] = await Promise.all([
      this.synchronizeOwners(githubRepositories, OWNER_ORGANIZATION),
      this.synchronizeOwners(githubRepositories, OWNER_USER),
    ]);

    const repositories = await Promise.all(
      githubRepositories.map(async (githubRepository) => {
        const data = {
          githubId: githubRepository.id,
          name: githubRepository.name,
          organizationId:
            organizationIdByRepositoryId[githubRepository.id] || null,
          userId: userIdByRepositoryId[githubRepository.id] || null,
          private: githubRepository.private,
          defaultBranch: githubRepository.default_branch,
        };

        const [repository] = await Repository.query().where({
          githubId: githubRepository.id,
        });

        if (repository) {
          return repository.$query().patchAndFetch(data);
        }

        return Repository.query().insertAndFetch(data);
      })
    );

    return { repositories, organizations };
  }

  async synchronizePurchase({
    githubId,
    account,
  }: {
    githubId: number;
    account: Account;
  }) {
    try {
      const { data } = await this.appOctokit.apps.getSubscriptionPlanForAccount(
        { account_id: githubId }
      );
      await updatePurchase(data, account);
    } catch (error: any) {
      if (error.status === 404) {
        await cancelPurchase(
          { effective_date: new Date().toISOString() },
          account
        );
        return;
      }

      throw error;
    }
  }

  async synchronizeOwners<T extends "Organization" | "User">(
    githubRepositories: GitHubRepository[],
    type: T
  ): Promise<{
    owners: T extends "Organization" ? Organization[] : User[];
    ownerIdByRepositoryId: Record<number, string>;
  }> {
    const githubOwners = githubRepositories.reduce(
      (githubOwners, githubRepository) => {
        if (githubRepository.owner.type !== type) {
          return githubOwners;
        }

        const exist = githubOwners.some(
          ({ id }) => id === githubRepository.owner.id
        );

        if (!exist) {
          githubOwners.push({
            id: githubRepository.owner.id,
            name: githubRepository.owner.name ?? null,
            login: githubRepository.owner.login,
          });
        }

        return githubOwners;
      },
      [] as { id: number; name: string | null; login: string }[]
    );

    let owners: Organization[] | User[];

    switch (type) {
      case OWNER_ORGANIZATION:
        owners = await Promise.all(
          githubOwners.map((githubOwner) =>
            this.synchronizeOrganization(githubOwner)
          )
        );
        break;
      case OWNER_USER:
        owners = await Promise.all(
          githubOwners.map((githubOwner) => this.synchronizeUser(githubOwner))
        );
        break;
      default:
        throw new Error(`Unsupported type ${type}`);
    }

    return {
      owners: owners as T extends "Organization" ? Organization[] : User[],
      ownerIdByRepositoryId: githubRepositories.reduce(
        (ownerIdByRepositoryId, githubRepository) => {
          if (githubRepository.owner.type === type) {
            // @ts-ignore
            ownerIdByRepositoryId[githubRepository.id] = owners.find(
              (owner: Organization | User) =>
                owner.githubId === githubRepository.owner.id
            ).id;
          }

          return ownerIdByRepositoryId;
        },
        {} as Record<number, string>
      ),
    };
  }

  // eslint-disable-next-line class-methods-use-this
  async synchronizeOrganization(options: { login: string }) {
    const organizationData = await this.octokit.orgs.get({
      org: options.login,
    });
    const githubOrganization = organizationData.data;
    let [organization] = await Organization.query().where({
      githubId: githubOrganization.id,
    });
    const data = {
      githubId: githubOrganization.id,
      name: githubOrganization.name ?? null,
      login: githubOrganization.login,
    };

    if (organization) {
      await organization.$query().patchAndFetch(data);
    } else {
      organization = await Organization.query().insert(data);
    }

    const account = await Account.getOrCreateAccount({
      organizationId: organization.id,
    });

    await this.synchronizePurchase({
      githubId: organization.githubId,
      account,
    });

    return organization;
  }

  // eslint-disable-next-line class-methods-use-this
  async synchronizeUser(options: { id: number; login: string }) {
    const data = { githubId: options.id, login: options.login };
    let user = await User.query().findOne({ githubId: options.id });

    if (user) {
      await user.$query().patchAndFetch(data);
    } else {
      user = await User.query().insert(data);
    }

    const account = await Account.getOrCreateAccount({
      userId: user.id,
    });

    await this.synchronizePurchase({
      githubId: user.githubId,
      account,
    });

    return user;
  }

  async synchronizeInstallationRepositoryRights(
    repositories: Repository[],
    installationId: string
  ) {
    const installationRepositoryRights =
      await InstallationRepositoryRight.query()
        .withGraphFetched("installation")
        .where({ installationId, delete: false });

    await Promise.all(
      repositories.map(async (repository) => {
        const hasRights = installationRepositoryRights.some(
          ({ repositoryId }) => repositoryId === repository.id
        );

        if (!hasRights) {
          await InstallationRepositoryRight.query().insert({
            installationId,
            repositoryId: repository.id,
          });
        }
      })
    );

    await Promise.all(
      installationRepositoryRights.map(async (installationRepositoryRight) => {
        const repositoryStillExists = repositories.find(
          ({ id }) => id === installationRepositoryRight.repositoryId
        );

        if (!repositoryStillExists) {
          await installationRepositoryRight.$query().delete();
        }
      })
    );
  }

  async synchronizeRepositoryRights(
    repositories: Repository[],
    userId: string
  ) {
    const userRepositoryRights = await UserRepositoryRight.query().where({
      userId,
    });

    await Promise.all(
      repositories.map(async (repository) => {
        const hasRights = userRepositoryRights.some(
          ({ repositoryId }) => repositoryId === repository.id
        );

        if (!hasRights) {
          await UserRepositoryRight.query().insert({
            userId,
            repositoryId: repository.id,
          });
        }
      })
    );

    await Promise.all(
      userRepositoryRights.map(async (userRepositoryRight) => {
        const repositoryStillExists = repositories.find(
          ({ id }) => id === userRepositoryRight.repositoryId
        );

        if (!repositoryStillExists) {
          await userRepositoryRight.$query().delete();
        }
      })
    );
  }

  async synchronizeOrganizationRights(
    organizations: Organization[],
    userId: string
  ) {
    const userOrganizationRights = await UserOrganizationRight.query().where({
      userId,
    });

    await Promise.all(
      organizations.map(async (organization) => {
        const hasRights = userOrganizationRights.some(
          ({ organizationId }) => organizationId === organization.id
        );

        if (!hasRights) {
          await UserOrganizationRight.query().insert({
            userId,
            organizationId: organization.id,
          });
        }
      })
    );

    await Promise.all(
      userOrganizationRights.map(async (userOrganizationRight) => {
        const organizationStillExists = organizations.find(
          ({ id }) => id === userOrganizationRight.organizationId
        );

        if (!organizationStillExists) {
          await userOrganizationRight.$query().delete();
        }
      })
    );
  }

  async synchronizeUserInstallations() {
    const githubInstallations = await this.octokit.paginate(
      this.octokit.apps.listInstallationsForAuthenticatedUser
    );

    return Promise.all(
      githubInstallations.map(async (githubInstallation) => {
        return getOrCreateInstallation({
          githubId: githubInstallation.id,
        });
      })
    );
  }

  async synchronizeUserInstallationRights(
    installations: Installation[],
    userId: string
  ) {
    const userInstallationRights = await UserInstallationRight.query().where({
      userId,
    });

    await Promise.all(
      installations.map(async (installation) => {
        const exists = userInstallationRights.some(
          ({ installationId }) => installationId === installation.id
        );

        if (!exists) {
          await UserInstallationRight.query().insertAndFetch({
            userId,
            installationId: installation.id,
          });
        }
      })
    );

    await Promise.all(
      userInstallationRights.map(async (userInstallationRight) => {
        const installationStillExists = installations.find(
          ({ id }) => id === userInstallationRight.installationId
        );

        if (!installationStillExists) {
          await userInstallationRight.$query().delete();
        }
      })
    );

    return installations;
  }

  async synchronize() {
    this.synchronization = await this.synchronization.$query();

    switch (this.synchronization.type) {
      case "installation":
        return this.synchronizeFromInstallation(
          this.synchronization.installationId
        );
      case "user":
        return this.synchronizeFromUser(this.synchronization.userId);
      default:
        throw new Error(
          `Unknown synchronization type "${this.synchronization.type}"`
        );
    }
  }

  async synchronizeFromInstallation(installationId: string) {
    const installation = await Installation.query()
      .findById(installationId)
      .withGraphFetched("users");

    if (installation.deleted) {
      await Promise.all(
        installation.users!.map(async (user) =>
          this.synchronizeFromUser(user.id)
        )
      );
      await this.synchronizeInstallationRepositoryRights([], installationId);
      return;
    }

    const appOctokit = getAppOctokit();
    this.appOctokit = appOctokit;

    const octokit = await getInstallationOctokit(
      installation.githubId,
      appOctokit
    );

    // If we don't get an octokit, then the installation has been removed
    // we deleted the installation
    if (!octokit) {
      await installation.$query().patch({ deleted: true });
      return;
    }

    this.octokit = octokit;

    await this.synchronizeAppRepositories(installationId);

    await Promise.all(
      installation.users!.map(async (user) => this.synchronizeFromUser(user.id))
    );
  }

  async synchronizeFromUser(userId: string) {
    const user = await User.query().findById(userId);
    const tokenValid = await checkAccessTokenValidity(user.accessToken);

    if (!tokenValid) {
      await this.synchronizeUserInstallationRights([], userId);
      await Promise.all([
        this.synchronizeRepositoryRights([], userId),
        this.synchronizeOrganizationRights([], userId),
      ]);
      return;
    }

    const appOctokit = getAppOctokit();
    this.appOctokit = appOctokit;

    this.octokit = getTokenOctokit(user.accessToken);

    const installations = await this.synchronizeUserInstallations();

    await this.synchronizeUserInstallationRights(installations, userId);

    const results = await Promise.all(
      installations.map((installation) =>
        this.synchronizeUserInstallationRepositories(installation)
      )
    );

    const { repositories, organizations } = results.reduce(
      (all, result) => {
        all.repositories = [...all.repositories, ...result.repositories];
        all.organizations = [...all.organizations, ...result.organizations];
        return all;
      },
      { repositories: [], organizations: [] } as {
        repositories: Repository[];
        organizations: Organization[];
      }
    );

    await Promise.all([
      this.synchronizeRepositoryRights(repositories, userId),
      this.synchronizeOrganizationRights(organizations, userId),
    ]);
  }
}
