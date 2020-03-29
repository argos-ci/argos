import { Model, mergeSchemas, timestampsSchema, jobModelSchema } from '../util'
import { Build } from './Build'

export class BuildNotification extends Model {
  static get tableName() {
    return 'build_notifications'
  }

  static get jsonSchema() {
    return mergeSchemas(timestampsSchema, jobModelSchema, {
      required: ['type', 'buildId'],
      properties: {
        type: {
          type: 'string',
          enum: [
            'queued',
            'progress',
            'no-diff-detected',
            'diff-detected',
            'diff-accepted',
            'diff-rejected',
          ],
        },
        buildId: { type: 'string' },
      },
    })
  }

  static get relationMappings() {
    return {
      build: {
        relation: Model.BelongsToOneRelation,
        modelClass: Build,
        join: {
          from: 'build_notifications.buildId',
          to: 'builds.id',
        },
      },
    }
  }
}
