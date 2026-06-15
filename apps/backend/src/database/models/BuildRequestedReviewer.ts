import type { RelationMappings } from "objection";

import { Model } from "../util/model";
import { timestampsSchema } from "../util/schemas";
import { Build } from "./Build";
import { User } from "./User";

export class BuildRequestedReviewer extends Model {
  static override tableName = "build_requested_reviewers";

  static override get idColumn() {
    return ["buildId", "userId"];
  }

  static override jsonSchema = {
    allOf: [
      timestampsSchema,
      {
        type: "object",
        required: ["buildId", "userId"],
        properties: {
          buildId: { type: "string" },
          userId: { type: "string" },
          requestedById: { type: ["string", "null"] },
        },
      },
    ],
  };

  buildId!: string;
  userId!: string;
  requestedById!: string | null;

  static override get relationMappings(): RelationMappings {
    return {
      build: {
        relation: Model.BelongsToOneRelation,
        modelClass: Build,
        join: {
          from: "build_requested_reviewers.buildId",
          to: "builds.id",
        },
      },
      user: {
        relation: Model.BelongsToOneRelation,
        modelClass: User,
        join: {
          from: "build_requested_reviewers.userId",
          to: "users.id",
        },
      },
      requestedBy: {
        relation: Model.BelongsToOneRelation,
        modelClass: User,
        join: {
          from: "build_requested_reviewers.requestedById",
          to: "users.id",
        },
      },
    };
  }

  build?: Build;
  user?: User;
  requestedBy?: User | null;
}
