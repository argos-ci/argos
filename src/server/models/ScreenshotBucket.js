import BaseModel from 'server/models/BaseModel';

export default class ScreenshotBucket extends BaseModel {
  static tableName = 'screenshotBuckets';

  static jsonSchema = {
    ...BaseModel.jsonSchema,
    required: [
      ...BaseModel.required,
      'name',
      'commit',
      'branch',
      'jobStatus',
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
      jobStatus: {
        type: 'string',
        enum: [
          'pending',
          'progress',
          'done',
        ],
      },
    },
  };
}
