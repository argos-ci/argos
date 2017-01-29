import BaseModel from 'server/models/BaseModel'

export default class Build extends BaseModel {
  static tableName = 'builds';

  static jsonSchema = {
    ...BaseModel.jsonSchema,
    required: [
      ...BaseModel.jsonSchema.required,
      'compareScreenshotBucketId',
    ],
    properties: {
      ...BaseModel.jsonSchema.properties,
      baseScreenshotBucketId: { type: 'string' },
      compareScreenshotBucketId: { type: 'string' },
      repositoryId: { type: 'string' },
    },
  };

  static relationMappings = {
    baseScreenshotBucket: {
      relation: BaseModel.BelongsToOneRelation,
      modelClass: 'ScreenshotBucket',
      join: {
        from: 'builds.baseScreenshotBucketId',
        to: 'screenshot_buckets.id',
      },
    },
    compareScreenshotBucket: {
      relation: BaseModel.BelongsToOneRelation,
      modelClass: 'ScreenshotBucket',
      join: {
        from: 'builds.compareScreenshotBucketId',
        to: 'screenshot_buckets.id',
      },
    },
    repository: {
      relation: BaseModel.BelongsToOneRelation,
      modelClass: 'Repository',
      join: {
        from: 'builds.repositoryId',
        to: 'repositories.id',
      },
    },
  };
}
