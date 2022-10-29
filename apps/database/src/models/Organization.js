import { Model, mergeSchemas, timestampsSchema } from "../util";
import { Repository } from "./Repository";
import { UserOrganizationRight } from "./UserOrganizationRight";

export class Organization extends Model {
  static get tableName() {
    return "organizations";
  }

  static get jsonSchema() {
    return mergeSchemas(timestampsSchema, {
      required: ["githubId", "login"],
      properties: {
        githubId: { type: "number" },
        name: { type: ["string", null] },
        login: { type: "string" },
      },
    });
  }

  static get relationMappings() {
    return {
      repositories: {
        relation: Model.HasManyRelation,
        modelClass: Repository,
        join: {
          from: "organizations.id",
          to: "repositories.organizationId",
        },
      },
      relatedRepositories: {
        relation: Model.ManyToManyRelation,
        modelClass: Repository,
        join: {
          from: "organizations.id",
          through: {
            from: "organization_repository_rights.organizationId",
            to: "organization_repository_rights.repositoryId",
          },
          to: "repositories.id",
        },
      },
    };
  }

  type() {
    return "organization";
  }

  async $checkWritePermission(user) {
    return Organization.checkWritePermission(this, user);
  }

  static async checkWritePermission(owner, user) {
    if (!user) return false;
    const userOrganizationRight = await UserOrganizationRight.query()
      .where({ userId: user.id, organizationId: owner.id })
      .first();
    return Boolean(userOrganizationRight);
  }
}
