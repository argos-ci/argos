import BaseModel, { mergeSchemas } from 'server/models/BaseModel'
import jobModelSchema from 'server/models/schemas/jobModelSchema'

export default class BuildNotification extends BaseModel {
  static tableName = 'build_notifications'

  static jsonSchema = mergeSchemas(BaseModel.jsonSchema, jobModelSchema, {
    required: ['type', 'buildId'],
    properties: {
      type: {
        type: 'string',
        enum: ['progress', 'no-diff-detected', 'diff-detected', 'diff-accepted', 'diff-rejected'],
      },
      buildId: { type: 'string' },
    },
  })

  static relationMappings = {
    build: {
      relation: BaseModel.BelongsToOneRelation,
      modelClass: 'Build',
      join: {
        from: 'build_notifications.buildId',
        to: 'builds.id',
      },
    },
  }
}
