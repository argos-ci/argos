import BaseModel from 'server/models/BaseModel'

export default class Build extends BaseModel {
  static tableName = 'builds';

  static jsonSchema = {
    ...BaseModel.jsonSchema,
    required: [
      ...BaseModel.jsonSchema.required,
    ],
    properties: {
      ...BaseModel.jsonSchema.properties,
    },
  };

  static relationMappings = {
  };
}
