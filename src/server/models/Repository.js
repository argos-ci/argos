import BaseModel, { mergeSchemas } from 'server/models/BaseModel'
import UserRepositoryRight from 'server/models/UserRepositoryRight'
import User from 'server/models/User'

export default class Repository extends BaseModel {
  static tableName = 'repositories'

  static jsonSchema = mergeSchemas(BaseModel.jsonSchema, {
    required: ['githubId', 'name', 'enabled', 'private', 'baselineBranch'],
    properties: {
      githubId: { type: 'number' },
      name: { type: 'string' },
      enabled: { type: 'boolean' },
      token: { type: 'string' },
      organizationId: { type: ['string', null] },
      userId: { type: ['string', null] },
      private: { type: 'boolean' },
      baselineBranch: { type: 'string' },
    },
  })

  static relationMappings = {
    builds: {
      relation: BaseModel.HasManyRelation,
      modelClass: 'Build',
      join: {
        from: 'repositories.id',
        to: 'builds.repositoryId',
      },
    },
    organization: {
      relation: BaseModel.BelongsToOneRelation,
      modelClass: 'Organization',
      join: {
        from: 'repositories.organizationId',
        to: 'organizations.id',
      },
    },
    user: {
      relation: BaseModel.BelongsToOneRelation,
      modelClass: 'User',
      join: {
        from: 'repositories.userId',
        to: 'users.id',
      },
    },
  }

  static getUsers(repositoryId) {
    return User.query()
      .select('users.*')
      .join('user_repository_rights', 'users.id', '=', 'user_repository_rights.userId')
      .join('repositories', 'user_repository_rights.repositoryId', '=', 'repositories.id')
      .where('repositories.id', repositoryId)
  }

  getUsers() {
    return this.constructor.getUsers(this.id)
  }

  async getOwner() {
    if (this.userId) {
      if (!this.user) {
        this.user = await this.$relatedQuery('user')
      }

      return this.user
    }

    if (this.organizationId) {
      if (!this.organization) {
        this.organization = await this.$relatedQuery('organization')
      }

      return this.organization
    }

    return null
  }

  async authorization(user) {
    if (!user) {
      return false
    }

    const userRepositoryRight = await UserRepositoryRight.query()
      .where({ userId: user.id, repositoryId: this.id })
      .limit(1)
      .first()

    return Boolean(userRepositoryRight)
  }

  static isAccessible(repository, user) {
    if (!repository) {
      return false
    }

    if (repository.private !== true) {
      return true
    }

    return repository.authorization(user)
  }
}
