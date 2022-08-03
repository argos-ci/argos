import { Model, mergeSchemas, timestampsSchema } from '../util'

export class Plan extends Model {
  static get tableName() {
    return 'plans'
  }

  static get jsonSchema() {
    return mergeSchemas(timestampsSchema, {
      required: ['name', 'screenshotsQuota', 'githubId'],
      properties: {
        name: { type: 'string' },
        screenshotsQuota: { type: 'number' },
        githubId: { type: 'number' },
      },
    })
  }
}
