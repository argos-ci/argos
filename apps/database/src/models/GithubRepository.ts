import { Model } from "../util/model.js";
import { mergeSchemas, timestampsSchema } from "../util/schemas.js";

export class GithubRepository extends Model {
  static override tableName = "github_repositories";

  static override jsonSchema = mergeSchemas(timestampsSchema, {
    required: ["name", "private", "defaultBranch", "githubId"],
    properties: {
      name: { type: "string" },
      private: { type: "boolean" },
      defaultBranch: { type: "string" },
      githubId: { type: "number" },
      githubAccountId: { type: ["string", "null"] },
    },
  });

  name!: string;
  private!: boolean;
  defaultBranch!: string;
  githubId!: number;
  githubAccountId!: string | null;
}
