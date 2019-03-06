import BaseModel, { mergeSchemas } from 'server/models/BaseModel'

export default class Screenshot extends BaseModel {
  static tableName = 'screenshots'

  static jsonSchema = mergeSchemas(BaseModel.jsonSchema, {
    required: ['name', 's3Id', 'screenshotBucketId'],
    properties: {
      name: { type: 'string' },
      s3Id: { type: 'string' },
      screenshotBucketId: { type: 'string' },
    },
  })

  static relationMappings = {
    screenshotBucket: {
      relation: BaseModel.BelongsToOneRelation,
      modelClass: 'ScreenshotBucket',
      join: {
        from: 'screenshots.screenshotBucketId',
        to: 'screenshot_buckets.id',
      },
    },
  }
}
