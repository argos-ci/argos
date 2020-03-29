import { Model, mergeSchemas, timestampsSchema } from '../util'
import { Installation } from './Installation'
import { User } from './User'

export class UserInstallationRight extends Model {
  static get tableName() {
    return 'user_installation_rights'
  }

  static get jsonSchema() {
    return mergeSchemas(timestampsSchema, {
      required: ['userId', 'installationId'],
      properties: {
        userId: { type: 'string' },
        installationId: { type: 'string' },
      },
    })
  }

  static get relationMappings() {
    return {
      user: {
        relation: Model.BelongsToOneRelation,
        modelClass: User,
        join: {
          from: 'user_installation_rights.userId',
          to: 'users.id',
        },
      },
      installation: {
        relation: Model.BelongsToOneRelation,
        modelClass: Installation,
        join: {
          from: 'user_installation_rights.installationId',
          to: 'installations.id',
        },
      },
    }
  }
}
