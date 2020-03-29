import { Octokit } from '@octokit/rest'
import config from '@argos-ci/config'
import {
  Organization,
  Repository,
  User,
  UserOrganizationRight,
  UserRepositoryRight,
} from '@argos-ci/database/models'

const OWNER_ORGANIZATION = 'Organization'
const OWNER_USER = 'User'

export class GitHubSynchronizer {
  constructor(synchronization) {
    this.synchronization = synchronization
    this.repositories = []
    this.organizationIds = []
  }

  async synchronizeRepositories() {
    const githubRepositories = await this.octokit.paginate(
      this.octokit.repos.list.endpoint.DEFAULTS,
    )

    const [
      {
        owners: organizations,
        ownerIdByRepositoryId: organizationIdByRepositoryId,
      },
      { ownerIdByRepositoryId: userIdByRepositoryId },
    ] = await Promise.all([
      this.synchronizeOwners(githubRepositories, OWNER_ORGANIZATION),
      this.synchronizeOwners(githubRepositories, OWNER_USER),
    ])

    const repositories = await Promise.all(
      githubRepositories.map(async githubRepository => {
        const data = {
          githubId: githubRepository.id,
          name: githubRepository.name,
          organizationId: organizationIdByRepositoryId[githubRepository.id],
          userId: userIdByRepositoryId[githubRepository.id],
          private: githubRepository.private,
        }

        let [repository] = await Repository.query().where({
          githubId: githubRepository.id,
        })

        if (repository) {
          await repository.$query().patchAndFetch(data)
        } else {
          repository = await Repository.query().insert({
            ...data,
            baselineBranch: 'master',
            enabled: false,
          })
        }

        return repository
      }),
    )

    return { repositories, organizations }
  }

  async synchronizeOwners(githubRepositories, type) {
    const githubOwners = githubRepositories.reduce(
      (githubOwners, githubRepository) => {
        if (githubRepository.owner.type !== type) {
          return githubOwners
        }

        let githubOwner = githubOwners.find(
          ({ id }) => id === githubRepository.owner.id,
        )

        if (!githubOwner) {
          githubOwner = githubRepository.owner
          githubOwners.push(githubRepository.owner)
        }

        return githubOwners
      },
      [],
    )

    let owners

    switch (type) {
      case OWNER_ORGANIZATION:
        owners = await Promise.all(
          githubOwners.map(githubOwner =>
            this.synchronizeOrganization(githubOwner),
          ),
        )
        break
      case OWNER_USER:
        owners = await Promise.all(
          githubOwners.map(githubOwner => this.synchronizeUser(githubOwner)),
        )
        break
      default:
        throw new Error(`Unsupported type ${type}`)
    }

    return {
      owners,
      ownerIdByRepositoryId: githubRepositories.reduce(
        (ownerIdByRepositoryId, githubRepository) => {
          if (githubRepository.owner.type === type) {
            ownerIdByRepositoryId[githubRepository.id] = owners.find(
              owner => owner.githubId === githubRepository.owner.id,
            ).id
          }

          return ownerIdByRepositoryId
        },
        {},
      ),
    }
  }

  // eslint-disable-next-line class-methods-use-this
  async synchronizeOrganization(githubOrganization) {
    const organizationData = await this.octokit.orgs.get({
      org: githubOrganization.login,
    })
    githubOrganization = organizationData.data
    let [organization] = await Organization.query().where({
      githubId: githubOrganization.id,
    })
    const data = {
      githubId: githubOrganization.id,
      name: githubOrganization.name,
      login: githubOrganization.login,
    }

    if (organization) {
      await organization.$query().patchAndFetch(data)
    } else {
      organization = await Organization.query().insert(data)
    }

    return organization
  }

  // eslint-disable-next-line class-methods-use-this
  async synchronizeUser(githubUser) {
    const data = { githubId: githubUser.id, login: githubUser.login }
    let user = await User.query()
      .where({ githubId: githubUser.id })
      .limit(1)
      .first()

    if (user) {
      await user.$query().patchAndFetch(data)
    } else {
      user = await User.query().insert(data)
    }

    return user
  }

  async synchronizeRepositoryRights(repositories) {
    const userRepositoryRights = await UserRepositoryRight.query().where({
      userId: this.synchronization.user.id,
    })

    await Promise.all(
      repositories.map(async repository => {
        const hasRights = userRepositoryRights.some(
          ({ repositoryId }) => repositoryId === repository.id,
        )

        if (!hasRights) {
          await UserRepositoryRight.query().insert({
            userId: this.synchronization.user.id,
            repositoryId: repository.id,
          })
        }
      }),
    )

    await Promise.all(
      userRepositoryRights.map(async userRepositoryRight => {
        const repositoryStillExists = repositories.find(
          ({ id }) => id === userRepositoryRight.repositoryId,
        )

        if (!repositoryStillExists) {
          await userRepositoryRight.$query().delete()
        }
      }),
    )
  }

  async synchronizeOrganizationRights(organizations) {
    const userOrganizationRights = await UserOrganizationRight.query().where({
      userId: this.synchronization.user.id,
    })

    await Promise.all(
      organizations.map(async organization => {
        const hasRights = userOrganizationRights.some(
          ({ organizationId }) => organizationId === organization.id,
        )

        if (!hasRights) {
          await UserOrganizationRight.query().insert({
            userId: this.synchronization.user.id,
            organizationId: organization.id,
          })
        }
      }),
    )

    await Promise.all(
      userOrganizationRights.map(async userOrganizationRight => {
        const organizationStillExists = organizations.find(
          ({ id }) => id === userOrganizationRight.organizationId,
        )

        if (!organizationStillExists) {
          await userOrganizationRight.$query().delete()
        }
      }),
    )
  }

  async synchronize() {
    this.synchronization = await this.synchronization
      .$query()
      .withGraphFetched('user')

    this.octokit = new Octokit({
      debug: config.get('env') === 'development',
      auth: this.synchronization.user.accessToken,
    })

    await this.synchronization.$relatedQuery('user')
    const { repositories, organizations } = await this.synchronizeRepositories()
    await this.synchronizeRepositoryRights(repositories)
    await this.synchronizeOrganizationRights(organizations)
  }
}
