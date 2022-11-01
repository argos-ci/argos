import type { RelationMappings } from "objection";

import { Model } from "../util/model.js";
import { mergeSchemas, timestampsSchema } from "../util/schemas.js";
import { Installation } from "./Installation.js";
import { Organization } from "./Organization.js";
import { Repository } from "./Repository.js";
import { Synchronization } from "./Synchronization.js";

export class User extends Model {
  static override tableName = "users";

  static override jsonSchema = mergeSchemas(timestampsSchema, {
    required: ["githubId", "login"],
    properties: {
      githubId: { type: "number" },
      accessToken: { type: "string" },
      name: { type: ["string", "null"] },
      login: { type: "string" },
      email: { type: ["string", "null"] },
      privateSync: { type: "boolean" },
      githubScopes: {
        type: ["array", "null"],
        items: { type: "string" },
        uniqueItems: true,
      },
      scopes: {
        type: ["array", "null"],
        items: { type: "string" },
        uniqueItems: true,
      },
    },
  });

  githubId!: number;
  accessToken!: string;
  name!: string | null;
  login!: string;
  email!: string | null;
  privateSync!: boolean;
  githubScopes!: string[] | null;
  scopes!: string[] | null;

  static override get relationMappings(): RelationMappings {
    return {
      synchronizations: {
        relation: Model.HasManyRelation,
        modelClass: Synchronization,
        join: {
          from: "users.id",
          to: "synchronizations.userId",
        },
        modify(builder) {
          return builder.orderBy("synchronizations.createdAt", "desc");
        },
      },
      organizations: {
        relation: Model.ManyToManyRelation,
        modelClass: Organization,
        join: {
          from: "users.id",
          through: {
            from: "user_organization_rights.userId",
            to: "user_organization_rights.organizationId",
          },
          to: "organizations.id",
        },
      },
      repositories: {
        relation: Model.HasManyRelation,
        modelClass: Repository,
        join: {
          from: "users.id",
          to: "repositories.userId",
        },
      },
      relatedRepositories: {
        relation: Model.ManyToManyRelation,
        modelClass: Repository,
        join: {
          from: "users.id",
          through: {
            from: "user_repository_rights.userId",
            to: "user_repository_rights.repositoryId",
          },
          to: "repositories.id",
        },
      },
      installations: {
        relation: Model.ManyToManyRelation,
        modelClass: Installation,
        join: {
          from: "users.id",
          through: {
            from: "user_installation_rights.userId",
            to: "user_installation_rights.installationId",
          },
          to: "installations.id",
        },
      },
    };
  }

  synchronizations?: Synchronization[];
  organizations?: Organization[];
  repositories?: Repository[];
  relatedRepositories?: Repository[];
  installations?: Installation[];

  type() {
    return "user";
  }

  $checkWritePermission(user: User) {
    return User.checkWritePermission(this, user);
  }

  static checkWritePermission(owner: User, user: User) {
    if (!user) return false;
    return owner.id === user.id;
  }
}
