import BaseModel from 'server/models/BaseModel';

export default class repository extends BaseModel {
  static tableName = 'repositories';

  static jsonSchema = {
    ...BaseModel.jsonSchema,
    required: [
      ...BaseModel.required,
      'githubId',
      'name',
      'enabled',
    ],
    properties: {
      ...BaseModel.jsonSchema.properties,
      githubId: {
        type: 'string',
      },
      name: {
        type: 'string',
      },
      enabled: {
        type: 'boolean',
      },
    },
  };
}
