import BaseModel from 'server/models/BaseModel'

export default class User extends BaseModel {
  static tableName = 'users';

  static jsonSchema = {
    ...BaseModel.jsonSchema,
    required: [
      ...BaseModel.jsonSchema.required,
      'githubId',
      'name',
      'email',
    ],
    properties: {
      ...BaseModel.jsonSchema.properties,
      githubId: {
        type: 'string',
      },
      name: {
        type: 'string',
      },
      email: {
        type: 'string',
      },
    },
  };
}
