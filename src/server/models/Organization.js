import BaseModel, { mergeSchemas } from 'server/models/BaseModel'

export default class Organization extends BaseModel {
  static tableName = 'organizations';

  static jsonSchema = mergeSchemas(BaseModel.jsonSchema, {
    required: [
      'githubId',
      'name',
    ],
    properties: {
      githubId: { type: 'number' },
      name: { type: 'string' },
    },
  });

  getUrlIdentifier() {
    return this.name
  }
}
