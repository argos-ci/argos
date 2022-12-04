import type { RelationMappings } from "objection";

import { Model } from "../util/model.js";
import { mergeSchemas, timestampsSchema } from "../util/schemas.js";
import { Repository } from "./Repository.js";
import type { User } from "./User.js";
import { UserOrganizationRight } from "./UserOrganizationRight.js";

export class Organization extends Model {
  static override tableName = "organizations";

  static override jsonSchema = mergeSchemas(timestampsSchema, {
    required: ["githubId", "login"],
    properties: {
      githubId: { type: "number" },
      name: { type: ["string", "null"] },
      login: { type: "string" },
    },
  });

  githubId!: number;
  name!: string | null;
  login!: string;

  static override get relationMappings(): RelationMappings {
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

  repositories?: Repository[];
  relatedRepositories?: Repository[];

  type() {
    return "organization";
  }

  async $checkWritePermission(user: User) {
    return Organization.checkWritePermission(this, user);
  }

  static async checkWritePermission(owner: Organization, user: User) {
    if (!user) return false;
    const userOrganizationRight = await UserOrganizationRight.query()
      .select("id")
      .where({ userId: user.id, organizationId: owner.id })
      .first();
    return Boolean(userOrganizationRight);
  }
}
