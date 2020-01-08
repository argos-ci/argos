import BaseModel, { mergeSchemas } from 'server/models/BaseModel'
import { OWNER_TYPES } from 'server/constants'

export default class User extends BaseModel {
  static tableName = 'users'

  static jsonSchema = mergeSchemas(BaseModel.jsonSchema, {
    required: ['githubId', 'login'],
    properties: {
      githubId: { type: 'number' },
      accessToken: { type: 'string' },
      name: { type: ['string', null] },
      login: { type: 'string' },
      email: { type: ['string', null] },
      privateSync: { type: 'boolean' },
      githubScopes: {
        type: ['array', null],
        items: { type: 'string' },
        uniqueItems: true,
      },
      scopes: {
        type: ['array', null],
        items: { type: 'string' },
        uniqueItems: true,
      },
    },
  })

  static relationMappings = {
    synchronizations: {
      relation: BaseModel.HasManyRelation,
      modelClass: 'Synchronization',
      join: {
        from: 'users.id',
        to: 'synchronizations.userId',
      },
      modify(builder) {
        return builder.orderBy('synchronizations.createdAt', 'desc')
      },
    },
    organizations: {
      relation: BaseModel.ManyToManyRelation,
      modelClass: 'Organization',
      join: {
        from: 'users.id',
        through: {
          from: 'user_organization_rights.userId',
          to: 'user_organization_rights.organizationId',
        },
        to: 'organizations.id',
      },
    },
    repositories: {
      relation: BaseModel.HasManyRelation,
      modelClass: 'Repository',
      join: {
        from: 'users.id',
        to: 'repositories.userId',
      },
    },
    relatedRepositories: {
      relation: BaseModel.ManyToManyRelation,
      modelClass: 'Repository',
      join: {
        from: 'users.id',
        through: {
          from: 'user_repository_rights.userId',
          to: 'user_repository_rights.repositoryId',
        },
        to: 'repositories.id',
      },
    },
  }

  type() {
    return OWNER_TYPES.user
  }

  $checkWritePermission(user) {
    return User.checkWritePermission(this, user)
  }

  static checkWritePermission(owner, user) {
    if (!user) return false
    return owner.id === user.id
  }
}
