import BaseModel from 'server/models/BaseModel';

export default class Organization extends BaseModel {
  static tableName = 'organizations';

  static jsonSchema = {
    ...BaseModel.jsonSchema,
    required: [
      ...BaseModel.jsonSchema.required,
      'githubId',
      'name',
    ],
    properties: {
      ...BaseModel.jsonSchema.properties,
      githubId: {
        type: 'string',
      },
      name: {
        type: 'string',
      },
    },
  };
}
