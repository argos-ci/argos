import { Model } from "objection";
import { z } from "zod";

import { zodToJsonSchema } from "@/util/zod";

import { Project } from "./Project";
import { Test } from "./Test";
import { User } from "./User";

const ActionSchema = z.enum(["files.ignored", "files.unignored"]);

type Action = z.infer<typeof ActionSchema>;

export class AuditTrail extends Model {
  static override tableName = "audit_trails";

  id!: string;
  date!: string;
  projectId!: string;
  testId!: string;
  userId!: string;
  action!: Action;

  static override get jsonSchema() {
    return {
      type: "object",
      required: ["date", "projectId", "testId", "userId", "action"],
      properties: {
        id: { type: "string" },
        date: { type: "string" },
        projectId: { type: "string" },
        testId: { type: "string" },
        userId: { type: "string" },
        action: zodToJsonSchema(ActionSchema),
      },
    };
  }

  static override relationMappings = {
    project: {
      relation: Model.BelongsToOneRelation,
      modelClass: Project,
      join: {
        from: "audit_trails.projectId",
        to: "projects.id",
      },
    },
    test: {
      relation: Model.BelongsToOneRelation,
      modelClass: Test,
      join: {
        from: "audit_trails.testId",
        to: "tests.id",
      },
    },
    user: {
      relation: Model.BelongsToOneRelation,
      modelClass: User,
      join: {
        from: "audit_trails.userId",
        to: "users.id",
      },
    },
  };

  project?: Project;
  test?: Test;
  user?: User;
}
