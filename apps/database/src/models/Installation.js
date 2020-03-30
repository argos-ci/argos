import { Model, mergeSchemas, timestampsSchema } from '../util'
import { Synchronization } from './Synchronization'
import { User } from './User'

export class Installation extends Model {
  static get tableName() {
    return 'installations'
  }

  static get jsonSchema() {
    return mergeSchemas(timestampsSchema, {
      required: ['githubId'],
      properties: {
        githubId: { type: 'number' },
        deleted: { type: 'boolean' },
      },
    })
  }

  static get relationMappings() {
    return {
      users: {
        relation: Model.ManyToManyRelation,
        modelClass: User,
        join: {
          from: 'installations.id',
          through: {
            from: 'user_installation_rights.installationId',
            to: 'user_installation_rights.userId',
          },
          to: 'users.id',
        },
      },
      synchronizations: {
        relation: Model.HasManyRelation,
        modelClass: Synchronization,
        join: {
          from: 'installations.id',
          to: 'synchronizations.installationId',
        },
        modify(builder) {
          return builder.orderBy('synchronizations.createdAt', 'desc')
        },
      },
    }
  }
}
