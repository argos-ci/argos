import BaseModel, { mergeSchemas } from 'server/models/BaseModel'
import { OWNER_TYPES } from 'server/constants'
import UserOrganizationRight from './UserOrganizationRight'

export default class Organization extends BaseModel {
  static tableName = 'organizations'

  static jsonSchema = mergeSchemas(BaseModel.jsonSchema, {
    required: ['githubId', 'login'],
    properties: {
      githubId: { type: 'number' },
      name: { type: ['string', null] },
      login: { type: 'string' },
    },
  })

  static relationMappings = {
    repositories: {
      relation: BaseModel.HasManyRelation,
      modelClass: 'Repository',
      join: {
        from: 'organizations.id',
        to: 'repositories.organizationId',
      },
    },
    relatedRepositories: {
      relation: BaseModel.ManyToManyRelation,
      modelClass: 'Repository',
      join: {
        from: 'organizations.id',
        through: {
          from: 'organization_repository_rights.organizationId',
          to: 'organization_repository_rights.repositoryId',
        },
        to: 'repositories.id',
      },
    },
  }

  type() {
    return OWNER_TYPES.organization
  }

  async $checkWritePermission(user) {
    return Organization.checkWritePermission(this, user)
  }

  static async checkWritePermission(owner, user) {
    if (!user) return false
    const userOrganizationRight = await UserOrganizationRight.query()
      .where({ userId: user.id, organizationId: owner.id })
      .first()
    return Boolean(userOrganizationRight)
  }
}
