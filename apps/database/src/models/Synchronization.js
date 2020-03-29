import { Model, mergeSchemas, timestampsSchema, jobModelSchema } from '../util'
import { User } from './User'

export class Synchronization extends Model {
  static get tableName() {
    return 'synchronizations'
  }

  static get jsonSchema() {
    return mergeSchemas(timestampsSchema, jobModelSchema, {
      required: ['userId', 'type'],
      properties: {
        userId: { type: 'string' },
        type: {
          type: 'string',
          enum: ['github'],
        },
      },
    })
  }

  static get relationMappings() {
    return {
      user: {
        relation: Model.BelongsToOneRelation,
        modelClass: User,
        join: {
          from: 'synchronizations.userId',
          to: 'users.id',
        },
      },
    }
  }
}
