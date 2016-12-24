import BaseModel from 'server/models/BaseModel';

export default class ScreenshotDiff extends BaseModel {
  static tableName = 'screenshotDiffs';

  static jsonSchema = {
    ...BaseModel.jsonSchema,
    required: [
      ...BaseModel.required,
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
}
