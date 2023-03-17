import type { RelationMappings } from "objection";

import { Model } from "../util/model.js";
import { mergeSchemas, timestampsSchema } from "../util/schemas.js";
import { Test } from "./Test.js";
import { User } from "./User.js";

export class TestActivity extends Model {
  static override tableName = "test_activities";

  static override jsonSchema = mergeSchemas(timestampsSchema, {
    required: ["testId", "userId", "action", "date"],
    properties: {
      testId: { type: "string" },
      userId: { type: "string" },
      date: { type: "string" },
      action: {
        type: ["string", "null"],
        enum: ["resolve", "unresolve", "mute", "unmute"],
      },
      data: {
        type: ["array", "null"],
        items: { type: "string" },
      },
    },
  });

  testId!: string;
  userId!: string;
  date!: string;
  action!: string | null;
  data!: any | null;

  static override get relationMappings(): RelationMappings {
    return {
      test: {
        relation: Model.BelongsToOneRelation,
        modelClass: Test,
        join: {
          from: "test_activities.testId",
          to: "tests.id",
        },
      },
      user: {
        relation: Model.BelongsToOneRelation,
        modelClass: User,
        join: {
          from: "test_activities.testId",
          to: "users.id",
        },
      },
    };
  }

  test?: Test;
  user?: User;
}
