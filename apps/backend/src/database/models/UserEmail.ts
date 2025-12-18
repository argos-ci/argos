import { Model, type RelationMappings } from "objection";

import { User } from "./User";

export class UserEmail extends Model {
  static override tableName = "user_emails";

  static override get idColumn() {
    return ["email"];
  }

  static override jsonSchema = {
    type: "object",
    required: ["email", "userId", "verified"],
    properties: {
      email: { type: "string", format: "email" },
      verified: { type: "boolean" },
      userId: { type: "string" },
    },
  };

  email!: string;
  verified!: boolean;
  userId!: string;

  static override get relationMappings(): RelationMappings {
    return {
      user: {
        relation: Model.HasOneRelation,
        modelClass: User,
        join: {
          from: "user_emails.userId",
          to: "users.id",
        },
      },
    };
  }

  user?: User;
}
