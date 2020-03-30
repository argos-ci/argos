import { Model, mergeSchemas, timestampsSchema } from '../util'
import { Synchronization } from './Synchronization'
import { Organization } from './Organization'
import { Repository } from './Repository'
import { Installation } from './Installation'

export class User extends Model {
  static get tableName() {
    return 'users'
  }

  static get jsonSchema() {
    return mergeSchemas(timestampsSchema, {
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
  }

  static get relationMappings() {
    return {
      synchronizations: {
        relation: Model.HasManyRelation,
        modelClass: Synchronization,
        join: {
          from: 'users.id',
          to: 'synchronizations.userId',
        },
        modify(builder) {
          return builder.orderBy('synchronizations.createdAt', 'desc')
        },
      },
      organizations: {
        relation: Model.ManyToManyRelation,
        modelClass: Organization,
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
        relation: Model.HasManyRelation,
        modelClass: Repository,
        join: {
          from: 'users.id',
          to: 'repositories.userId',
        },
      },
      relatedRepositories: {
        relation: Model.ManyToManyRelation,
        modelClass: Repository,
        join: {
          from: 'users.id',
          through: {
            from: 'user_repository_rights.userId',
            to: 'user_repository_rights.repositoryId',
          },
          to: 'repositories.id',
        },
      },
      installations: {
        relation: Model.ManyToManyRelation,
        modelClass: Installation,
        join: {
          from: 'users.id',
          through: {
            from: 'user_installation_rights.userId',
            to: 'user_installation_rights.installationId',
          },
          to: 'installations.id',
        },
      },
    }
  }

  type() {
    return 'user'
  }

  $checkWritePermission(user) {
    return User.checkWritePermission(this, user)
  }

  static checkWritePermission(owner, user) {
    if (!user) return false
    return owner.id === user.id
  }
}
