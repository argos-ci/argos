import BaseModel from 'server/models/BaseModel';

export default class Screenshot extends BaseModel {
  static tableName = 'screenshots';

  static jsonSchema = {
    ...BaseModel.jsonSchema,
    required: [
      ...BaseModel.jsonSchema.required,
      'name',
      's3Id',
    ],
    properties: {
      ...BaseModel.jsonSchema.properties,
      name: {
        type: 'string',
      },
      s3Id: {
        type: 'string',
      },
    },
  };
}
