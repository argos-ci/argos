import BaseModel from 'server/models/BaseModel'

export default class ScreenshotDiff extends BaseModel {
  static tableName = 'screenshot_diffs';
  static jsonSchema = {
    ...BaseModel.jsonSchema,
    required: [
      ...BaseModel.jsonSchema.required,
      'buildId',
      'baseScreenshotId',
      'compareScreenshotId',
      'jobStatus',
      'validationStatus',
    ],
    properties: {
      ...BaseModel.jsonSchema.properties,
      buildId: { type: 'string' },
      baseScreenshotId: { type: 'string' },
      compareScreenshotId: { type: 'string' },
      score: { type: 'number' },
      jobStatus: {
        type: 'string',
        enum: [
          'pending',
          'progress',
          'complete',
        ],
      },
      validationStatus: {
        type: 'string',
        enum: [
          'unknown',
          'accepted',
          'rejected',
        ],
      },
    },
  };

  static relationMappings = {
    build: {
      relation: BaseModel.BelongsToOneRelation,
      modelClass: 'Build',
      join: {
        from: 'screenshot_diffs.buildId',
        to: 'builds.id',
      },
    },
    baseScreenshot: {
      relation: BaseModel.BelongsToOneRelation,
      modelClass: 'Screenshot',
      join: {
        from: 'screenshot_diffs.baseScreenshotId',
        to: 'screenshots.id',
      },
    },
    compareScreenshot: {
      relation: BaseModel.BelongsToOneRelation,
      modelClass: 'Screenshot',
      join: {
        from: 'screenshot_diffs.compareScreenshotId',
        to: 'screenshots.id',
      },
    },
  };
}
