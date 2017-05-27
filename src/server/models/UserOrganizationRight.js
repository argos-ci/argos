import BaseModel, { mergeSchemas } from 'server/models/BaseModel'

export default class UserOrganizationRight extends BaseModel {
  static tableName = 'user_organization_rights'

  static jsonSchema = mergeSchemas(BaseModel.jsonSchema, {
    required: ['userId', 'organizationId'],
    properties: {
      userId: { type: 'string' },
      organizationId: { type: 'string' },
    },
  })

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
  }
}
