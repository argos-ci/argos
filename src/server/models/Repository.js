import BaseModel from 'server/models/BaseModel'

export default class Repository extends BaseModel {
  static tableName = 'repositories';

  static jsonSchema = {
    ...BaseModel.jsonSchema,
    required: [
      ...BaseModel.jsonSchema.required,
      'githubId',
      'name',
      'enabled',
    ],
    properties: {
      ...BaseModel.jsonSchema.properties,
      githubId: { type: 'number' },
      name: { type: 'string' },
      enabled: { type: 'boolean' },
      token: { type: 'string' },
      organizationId: { type: ['string', null] },
      userId: { type: ['string', null] },
    },
  };

  static relationMappings = {
    organization: {
      relation: BaseModel.BelongsToOneRelation,
      modelClass: 'Organization',
      join: {
        from: 'repositories.organizationId',
        to: 'organizations.id',
      },
    },
    user: {
      relation: BaseModel.BelongsToOneRelation,
      modelClass: 'User',
      join: {
        from: 'repositories.userId',
        to: 'users.id',
      },
    },
  };

  async getOwner() {
    if (this.userId) {
      if (!this.user) {
        [this.user] = await this.$relatedQuery('user')
      }

      return this.user
    }

    if (this.organizationId) {
      if (!this.organization) {
        [this.organization] = await this.$relatedQuery('organization')
      }

      return this.organization
    }

    return null
  }
}
