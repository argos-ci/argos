import BaseModel, { mergeSchemas } from 'server/models/BaseModel'

const SHA1_REGEXP = '^[a-zA-Z0-9]{40}$'

export default class ScreenshotBucket extends BaseModel {
  static tableName = 'screenshot_buckets'

  static jsonSchema = mergeSchemas(BaseModel.jsonSchema, {
    required: ['name', 'commit', 'branch'],
    properties: {
      name: { type: 'string' },
      commit: {
        type: 'string',
        pattern: SHA1_REGEXP,
      },
      branch: { type: 'string' },
      repositoryId: { type: 'string' },
    },
  })

  static relationMappings = {
    screenshots: {
      relation: BaseModel.HasManyRelation,
      modelClass: 'Screenshot',
      join: {
        from: 'screenshot_buckets.id',
        to: 'screenshots.screenshotBucketId',
      },
    },
    repository: {
      relation: BaseModel.BelongsToOneRelation,
      modelClass: 'Repository',
      join: {
        from: 'screenshot_buckets.repositoryId',
        to: 'repositories.id',
      },
    },
  }
}
