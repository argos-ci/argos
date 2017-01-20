import BaseModel from 'server/models/BaseModel'

export default class ScreenshotDiff extends BaseModel {
  static tableName = 'screenshot_diffs';

  static jsonSchema = {
    ...BaseModel.jsonSchema,
    required: [
      ...BaseModel.jsonSchema.required,
      'score',
      'jobStatus',
      'validationStatus',
    ],
    properties: {
      ...BaseModel.jsonSchema.properties,
      score: {
        type: 'number',
      },
      jobStatus: {
        type: 'string',
        enum: [
          'pending',
          'progress',
          'done',
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
  };
}
