import type { RelationMappings } from "objection";

import {
  PROJECT_TOKEN_PERMISSION_LIST,
  type ProjectTokenPermission,
} from "@/project-token/permissions";

import { generateRandomString } from "../services/crypto";
import { Model } from "../util/model";
import { timestampsSchema } from "../util/schemas";
import { Account } from "./Account";
import { Project } from "./Project";
import { User } from "./User";

/**
 * A credential CI and the SDK authenticate with to act on projects. It belongs
 * to the account that owns those projects; only its SHA-256 hash is stored.
 */
export class ProjectToken extends Model {
  static override tableName = "project_tokens";

  static override jsonSchema = {
    allOf: [
      timestampsSchema,
      {
        type: "object",
        required: ["accountId", "name", "token", "permissions"],
        properties: {
          accountId: { type: "string" },
          name: { type: "string", minLength: 1, maxLength: 255 },
          token: { type: "string", minLength: 64, maxLength: 64 },
          permissions: {
            type: "array",
            items: { type: "string", enum: PROJECT_TOKEN_PERMISSION_LIST },
            minItems: 1,
            uniqueItems: true,
          },
          expireAt: { type: ["string", "null"] },
          lastUsedAt: { type: ["string", "null"] },
          createdById: { type: ["string", "null"] },
        },
      },
    ],
  };

  accountId!: string;
  name!: string;
  token!: string;
  permissions!: ProjectTokenPermission[];
  expireAt!: string | null;
  lastUsedAt!: string | null;
  createdById!: string | null;

  static override get jsonAttributes() {
    return ["permissions"];
  }

  static override get relationMappings(): RelationMappings {
    return {
      account: {
        relation: Model.BelongsToOneRelation,
        modelClass: Account,
        join: {
          from: "project_tokens.accountId",
          to: "accounts.id",
        },
      },
      createdBy: {
        relation: Model.BelongsToOneRelation,
        modelClass: User,
        join: {
          from: "project_tokens.createdById",
          to: "users.id",
        },
      },
      projects: {
        relation: Model.ManyToManyRelation,
        modelClass: Project,
        join: {
          from: "project_tokens.id",
          through: {
            from: "project_token_projects.projectTokenId",
            to: "project_token_projects.projectId",
          },
          to: "projects.id",
        },
      },
    };
  }

  account?: Account;
  createdBy?: User | null;
  projects?: Project[];

  /**
   * Generate a token. Same shape as the tokens projects had before
   * `project_tokens`: the SDK rejects anything but 40 characters.
   */
  static generateToken() {
    return `argos_${generateRandomString(34)}`;
  }

  /**
   * Whether the token is past its expiration date.
   */
  $isExpired() {
    return this.expireAt !== null && new Date(this.expireAt) <= new Date();
  }
}
