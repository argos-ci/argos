import BaseModel from 'server/models/BaseModel'

export default class UserOrganizationRight extends BaseModel {
  static tableName = 'user_organization_rights';

  static jsonSchema = {
    ...BaseModel.jsonSchema,
    required: [
      ...BaseModel.jsonSchema.required,
      'userId',
      'organizationId',
    ],
    properties: {
      ...BaseModel.jsonSchema.properties,
      userId: { type: 'string' },
      organizationId: { type: 'string' },
    },
  };

  static relationMappings = {
    user: {
      relation: BaseModel.BelongsToOneRelation,
      modelClass: 'User',
      join: {
        from: 'user_organization_rights.userId',
        to: 'users.id',
      },
    },
    organization: {
      relation: BaseModel.BelongsToOneRelation,
      modelClass: 'Organization',
      join: {
        from: 'user_organization_rights.organizationId',
        to: 'organizations.id',
      },
    },
  };
}
