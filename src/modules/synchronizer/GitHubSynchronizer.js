import GitHubAPI from 'github'
import config from 'config'
import Organization from 'server/models/Organization'
import Repository from 'server/models/Repository'
import User from 'server/models/User'
import UserOrganizationRight from 'server/models/UserOrganizationRight'
import UserRepositoryRight from 'server/models/UserRepositoryRight'

const OWNER_ORGANIZATION = 'Organization'
const OWNER_USER = 'User'

class GitHubSynchronizer {
  constructor(synchronization) {
    this.synchronization = synchronization
    this.github = new GitHubAPI({ debug: config.get('env') === 'development' })
    this.repositories = []
    this.organizationIds = []
  }

  async synchronizeRepositories({ page = 1 } = {}) {
    const githubRepositories = await this.github.repos.getAll({ page, per_page: 100 })

    const [
      { owners: organizations, ownerIdByRepositoryId: organizationIdByRepositoryId },
      { ownerIdByRepositoryId: userIdByRepositoryId },
    ] = await Promise.all([
      this.synchronizeOwners(githubRepositories, OWNER_ORGANIZATION),
      this.synchronizeOwners(githubRepositories, OWNER_USER),
    ])

    const repositories = await Promise.all(
      githubRepositories.data.map(async githubRepository => {
        const data = {
          githubId: githubRepository.id,
          name: githubRepository.name,
          organizationId: organizationIdByRepositoryId[githubRepository.id],
          userId: userIdByRepositoryId[githubRepository.id],
          private: githubRepository.private,
        }

        let [repository] = await Repository.query().where({ githubId: githubRepository.id })

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
      })
    )

    if (this.github.hasNextPage(githubRepositories)) {
      const nextPageData = await this.synchronizeRepositories({ page: page + 1 })

      nextPageData.repositories.forEach(repository => {
        if (!repositories.find(({ id }) => id === repository.id)) {
          repositories.push(repository)
        }
      })

      nextPageData.organizations.forEach(organization => {
        if (!organizations.find(({ id }) => id === organization.id)) {
          organizations.push(organization)
        }
      })
    }

    return { repositories, organizations }
  }

  async synchronizeOwners(githubRepositories, type) {
    const githubOwners = githubRepositories.data.reduce((githubOwners, githubRepository) => {
      if (githubRepository.owner.type !== type) {
        return githubOwners
      }

      let githubOwner = githubOwners.find(({ id }) => id === githubRepository.owner.id)

      if (!githubOwner) {
        githubOwner = githubRepository.owner
        githubOwners.push(githubRepository.owner)
      }

      return githubOwners
    }, [])

    let owners

    switch (type) {
      case OWNER_ORGANIZATION:
        owners = await Promise.all(
          githubOwners.map(githubOwner => this.synchronizeOrganization(githubOwner))
        )
        break
      case OWNER_USER:
        owners = await Promise.all(
          githubOwners.map(githubOwner => this.synchronizeUser(githubOwner))
        )
        break
      default:
        throw new Error(`Unsupported type ${type}`)
    }

    return {
      owners,
      ownerIdByRepositoryId: githubRepositories.data.reduce(
        (ownerIdByRepositoryId, githubRepository) => {
          if (githubRepository.owner.type === type) {
            ownerIdByRepositoryId[githubRepository.id] = owners.find(
              owner => owner.githubId === githubRepository.owner.id
            ).id
          }

          return ownerIdByRepositoryId
        },
        {}
      ),
    }
  }

  // eslint-disable-next-line class-methods-use-this
  async synchronizeOrganization(githubOrganization) {
    const organizationData = await this.github.orgs.get({ org: githubOrganization.login })
    githubOrganization = organizationData.data
    let [organization] = await Organization.query().where({ githubId: githubOrganization.id })
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
          ({ repositoryId }) => repositoryId === repository.id
        )

        if (!hasRights) {
          await UserRepositoryRight.query().insert({
            userId: this.synchronization.user.id,
            repositoryId: repository.id,
          })
        }
      })
    )

    await Promise.all(
      userRepositoryRights.map(async userRepositoryRight => {
        const repositoryStillExists = repositories.find(
          ({ id }) => id === userRepositoryRight.repositoryId
        )

        if (!repositoryStillExists) {
          await userRepositoryRight.$query().delete()
        }
      })
    )
  }

  async synchronizeOrganizationRights(organizations) {
    const userOrganizationRights = await UserOrganizationRight.query().where({
      userId: this.synchronization.user.id,
    })

    await Promise.all(
      organizations.map(async organization => {
        const hasRights = userOrganizationRights.some(
          ({ organizationId }) => organizationId === organization.id
        )

        if (!hasRights) {
          await UserOrganizationRight.query().insert({
            userId: this.synchronization.user.id,
            organizationId: organization.id,
          })
        }
      })
    )

    await Promise.all(
      userOrganizationRights.map(async userOrganizationRight => {
        const organizationStillExists = organizations.find(
          ({ id }) => id === userOrganizationRight.organizationId
        )

        if (!organizationStillExists) {
          await userOrganizationRight.$query().delete()
        }
      })
    )
  }

  async synchronize() {
    this.synchronization = await this.synchronization.$query().eager('user')

    this.github.authenticate({
      type: 'oauth',
      token: this.synchronization.user.accessToken,
    })

    await this.synchronization.$relatedQuery('user')
    const { repositories, organizations } = await this.synchronizeRepositories()
    await this.synchronizeRepositoryRights(repositories)
    await this.synchronizeOrganizationRights(organizations)
  }
}

export default GitHubSynchronizer
