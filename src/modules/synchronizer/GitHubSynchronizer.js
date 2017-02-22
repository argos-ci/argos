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

    this.github = new GitHubAPI({
      debug: config.get('env') === 'development',
    })
    this.github.authenticate({
      type: 'oauth',
      token: synchronization.user.accessToken,
    })
  }

  async synchronizeRepositories({ page = 1 } = {}) {
    const githubRepositories = await this.github.repos.getAll({ page, per_page: 100 })

    const [organizationIdByRepositoryId, userIdByRepositoryId] = await Promise.all([
      this.synchronizeOwners(githubRepositories, OWNER_ORGANIZATION),
      this.synchronizeOwners(githubRepositories, OWNER_USER),
    ])

    await Promise.all(githubRepositories.map(async (githubRepository) => {
      const data = {
        githubId: githubRepository.id,
        name: githubRepository.name,
        organizationId: organizationIdByRepositoryId[githubRepository.id],
        userId: userIdByRepositoryId[githubRepository.id],
      }

      let [repository] = await Repository.query().where({ githubId: githubRepository.id })

      if (repository) {
        await repository.$query().patch(data)
      } else {
        repository = await Repository.query().insert({
          ...data,
          enabled: false,
        })
      }

      const [userRepositoryRight] = await UserRepositoryRight.query().where({
        userId: this.synchronization.user.id,
        repositoryId: repository.id,
      })

      if (!userRepositoryRight) {
        await UserRepositoryRight.query().insert({
          userId: this.synchronization.user.id,
          repositoryId: repository.id,
        })
      }
    }))

    if (this.github.hasNextPage(githubRepositories)) {
      await this.synchronizeRepositories({ page: page + 1 })
    }
  }

  async synchronizeOwners(githubRepositories, type) {
    const githubOwners = githubRepositories
      .reduce((githubOwners, githubRepository) => {
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

    switch (type) { // eslint-disable-line default-case
      case OWNER_ORGANIZATION:
        owners = await Promise.all(
          githubOwners.map(githubOwner => this.synchronizeOrganization(githubOwner)),
        )
        break
      case OWNER_USER:
        owners = await Promise.all(
          githubOwners.map(githubOwner => this.synchronizeUser(githubOwner)),
        )
        break
    }

    return githubRepositories
      .reduce((ownerIdByRepositoryId, githubRepository) => {
        if (githubRepository.owner.type === type) {
          ownerIdByRepositoryId[githubRepository.id] = owners
            .find(owner => owner.githubId === githubRepository.owner.id).id
        }

        return ownerIdByRepositoryId
      }, {})
  }

  async synchronizeOrganization(githubOrganization) {
    let [organization] = await Organization.query().where({ githubId: githubOrganization.id })
    const data = {
      githubId: githubOrganization.id,
      name: githubOrganization.login,
    }

    if (organization) {
      await organization.$query().patch(data)
    } else {
      organization = await Organization.query().insert(data)
    }

    const [userOrganization] = await UserOrganizationRight.query().where({
      userId: this.synchronization.user.id,
      organizationId: organization.id,
    })

    if (!userOrganization) {
      await UserOrganizationRight.query().insert({
        userId: this.synchronization.user.id,
        organizationId: organization.id,
      })
    }

    return organization
  }

  async synchronizeUser(githubUser) { // eslint-disable-line class-methods-use-this
    let [user] = await User.query().where({ githubId: githubUser.id })
    const data = { githubId: githubUser.id, login: githubUser.login }

    if (user) {
      await user.$query().patch(data)
    } else {
      user = await User.query().insert(data)
    }

    return user
  }

  async synchronize() {
    await this.synchronization.$relatedQuery('user')
    await this.synchronizeRepositories()
  }
}

export default GitHubSynchronizer
