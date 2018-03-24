import BaseModel, { mergeSchemas } from 'server/models/BaseModel'

export default class ScreenshotBatch extends BaseModel {
  static tableName = 'screenshot_batches'

  static jsonSchema = mergeSchemas(BaseModel.jsonSchema, {
    required: ['screenshotBucketId', 'externalId'],
    properties: {
      screenshotBucketId: { type: 'string' },
      externalId: { type: ['string', null] },
    },
  })

  static relationMappings = {
    screenshotBucket: {
      relation: BaseModel.BelongsToOneRelation,
      modelClass: 'ScreenshotBucket',
      join: {
        from: 'screenshot_batches.screenshotBucketId',
        to: 'screenshot_buckets.id',
      },
    },
  }
}
