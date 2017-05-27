import BaseModel, { mergeSchemas } from 'server/models/BaseModel'
import jobModelSchema from 'server/models/schemas/jobModelSchema'

export default class Synchronization extends BaseModel {
  static tableName = 'synchronizations'

  static jsonSchema = mergeSchemas(BaseModel.jsonSchema, jobModelSchema, {
    required: ['userId', 'type'],
    properties: {
      userId: { type: 'string' },
      type: {
        type: 'string',
        enum: ['github'],
      },
    },
  })

  static relationMappings = {
    user: {
      relation: BaseModel.BelongsToOneRelation,
      modelClass: 'User',
      join: {
        from: 'synchronizations.userId',
        to: 'users.id',
      },
    },
  }
}
