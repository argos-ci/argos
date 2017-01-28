import BaseModel from 'server/models/BaseModel'

export default class ScreenshotBucket extends BaseModel {
  static tableName = 'screenshot_buckets';

  static jsonSchema = {
    ...BaseModel.jsonSchema,
    required: [
      ...BaseModel.jsonSchema.required,
      'name',
      'commit',
      'branch',
    ],
    properties: {
      ...BaseModel.jsonSchema.properties,
      name: {
        type: 'string',
      },
      commit: {
        type: 'string',
      },
      branch: {
        type: 'string',
      },
    },
  };

  static relationMappings = {
    screenshots: {
      relation: BaseModel.HasManyRelation,
      modelClass: 'Screenshot',
      join: {
        from: 'screenshot_buckets.id',
        to: 'screenshots.screenshotBucketId',
      },
    },
  };

  async baseScreenshotBucket() {
    const buckets = await this.constructor.query()
      .where({ branch: 'master' })
      .orderBy('id', 'desc')

    return buckets[0] || null
  }
}
