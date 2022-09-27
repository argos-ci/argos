/* eslint-disable no-await-in-loop */
import {
  getOAuthOctokit,
  getTokenOctokit,
  getInstallationOctokit,
  getAppOctokit,
} from "@argos-ci/github";
import {
  Installation,
  Organization,
  Repository,
  User,
  UserOrganizationRight,
  UserRepositoryRight,
  UserInstallationRight,
  InstallationRepositoryRight,
} from "@argos-ci/database/models";
import config from "@argos-ci/config";
import { cancelPurchase, createAccountPayload } from "./eventHelpers";
import { updatePurchase } from "./updatePurchase";

export async function getOrCreateInstallation(payload) {
  const installation = await Installation.query()
    .where({ githubId: payload.githubId })
    .first();

  if (installation) return installation;
  return Installation.query().insertAndFetch(payload);
}

async function checkAccessTokenValidity(accessToken) {
  const oauthOctokit = getOAuthOctokit();
  try {
    await oauthOctokit.apps.checkToken({
      access_token: accessToken,
      client_id: config.get("github.clientId"),
    });
  } catch (error) {
    if (error.status === 404) {
      return false;
    }

    throw error;
  }

  return true;
}

const OWNER_ORGANIZATION = "Organization";
const OWNER_USER = "User";

export class GitHubSynchronizer {
  constructor(synchronization) {
    this.synchronization = synchronization;
    this.repositories = [];
    this.organizationIds = [];
  }

  async synchronizeAppRepositories(installationId) {
    const options =
      this.octokit.apps.listReposAccessibleToInstallation.endpoint.DEFAULTS;
    const githubRepositories = await this.octokit.paginate(options);
    const { repositories, organizations } = await this.synchronizeRepositories(
      githubRepositories
    );

    await this.synchronizeInstallationRepositoryRights(
      repositories,
      installationId
    );

    return { repositories, organizations };
  }

  async getInstallationRepositories(options) {
    try {
      return await this.octokit.paginate(options);
    } catch (error) {
      if (error.response.status === 404) return [];
      throw error;
    }
  }

  async synchronizeUserInstallationRepositories(installation) {
    const options =
      this.octokit.apps.listInstallationReposForAuthenticatedUser.endpoint.merge(
        { installation_id: installation.githubId }
      );
    const githubRepositories = await this.getInstallationRepositories(options);
    const { repositories, organizations } = await this.synchronizeRepositories(
      githubRepositories
    );

    await this.synchronizeInstallationRepositoryRights(
      repositories,
      installation.id
    );

    return { repositories, organizations };
  }

  async synchronizeRepositories(githubRepositories) {
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

        let [repository] = await Repository.query().where({
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

  async synchronizePurchase({ type, githubId }) {
    try {
      const { data } = await this.appOctokit.apps.getSubscriptionPlanForAccount(
        { account_id: githubId }
      );
      await updatePurchase(data);
    } catch (error) {
      if (error.status === 404) {
        await cancelPurchase(createAccountPayload({ id: githubId, type }));
        return;
      }

      throw error;
    }
  }

  async synchronizeOwners(githubRepositories, type) {
    const githubOwners = githubRepositories.reduce(
      (githubOwners, githubRepository) => {
        if (githubRepository.owner.type !== type) {
          return githubOwners;
        }

        let githubOwner = githubOwners.find(
          ({ id }) => id === githubRepository.owner.id
        );

        if (!githubOwner) {
          githubOwner = githubRepository.owner;
          githubOwners.push(githubRepository.owner);
        }

        return githubOwners;
      },
      []
    );

    let owners;

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
      owners,
      ownerIdByRepositoryId: githubRepositories.reduce(
        (ownerIdByRepositoryId, githubRepository) => {
          if (githubRepository.owner.type === type) {
            ownerIdByRepositoryId[githubRepository.id] = owners.find(
              (owner) => owner.githubId === githubRepository.owner.id
            ).id;
          }

          return ownerIdByRepositoryId;
        },
        {}
      ),
    };
  }

  // eslint-disable-next-line class-methods-use-this
  async synchronizeOrganization(githubOrganization) {
    const organizationData = await this.octokit.orgs.get({
      org: githubOrganization.login,
    });
    githubOrganization = organizationData.data;
    let [organization] = await Organization.query().where({
      githubId: githubOrganization.id,
    });
    const data = {
      githubId: githubOrganization.id,
      name: githubOrganization.name,
      login: githubOrganization.login,
    };

    if (organization) {
      await organization.$query().patchAndFetch(data);
    } else {
      organization = await Organization.query().insert(data);
    }

    await this.synchronizePurchase({
      type: "organization",
      githubId: organization.githubId,
    });

    return organization;
  }

  // eslint-disable-next-line class-methods-use-this
  async synchronizeUser(githubUser) {
    const data = { githubId: githubUser.id, login: githubUser.login };
    let user = await User.query().where({ githubId: githubUser.id }).first();

    if (user) {
      await user.$query().patchAndFetch(data);
    } else {
      user = await User.query().insert(data);
    }

    await this.synchronizePurchase({ type: "user", githubId: user.githubId });

    return user;
  }

  async synchronizeInstallationRepositoryRights(repositories, installationId) {
    const installationRepositoryRights =
      await InstallationRepositoryRight.query().where({
        installationId,
      });

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

  async synchronizeRepositoryRights(repositories, userId) {
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

  async synchronizeOrganizationRights(organizations, userId) {
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
    const options =
      this.octokit.apps.listInstallationsForAuthenticatedUser.endpoint.DEFAULTS;
    const githubInstallations = await this.octokit.paginate(options);

    return Promise.all(
      githubInstallations.map(async (githubInstallation) => {
        return getOrCreateInstallation({
          githubId: githubInstallation.id,
          deleted: false,
        });
      })
    );
  }

  async synchronizeUserInstallationRights(installations, userId) {
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

  async synchronizeFromInstallation(installationId) {
    const installation = await Installation.query()
      .findById(installationId)
      .withGraphFetched("users");

    if (installation.deleted) {
      await Promise.all(
        installation.users.map(async (user) =>
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
      installation.users.map(async (user) => this.synchronizeFromUser(user.id))
    );
  }

  async synchronizeFromUser(userId) {
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

    const installations = await this.synchronizeUserInstallations(userId);

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
      { repositories: [], organizations: [] }
    );

    await Promise.all([
      this.synchronizeRepositoryRights(repositories, userId),
      this.synchronizeOrganizationRights(organizations, userId),
    ]);
  }
}
