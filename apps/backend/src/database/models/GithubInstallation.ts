import { Model } from "../util/model.js";
import { mergeSchemas, timestampsSchema } from "../util/schemas.js";

export class GithubInstallation extends Model {
  static override tableName = "github_installations";

  static override jsonSchema = mergeSchemas(timestampsSchema, {
    required: ["githubId"],
    properties: {
      githubId: { type: "number" },
      deleted: { type: "boolean" },
      githubToken: { type: ["string", "null"] },
      githubTokenExpiresAt: { type: ["string", "null"] },
      app: { type: "string", enum: ["main", "light"] },
    },
  });

  githubId!: number;
  deleted!: boolean;
  githubToken!: string | null;
  githubTokenExpiresAt!: string | null;
  app!: "main" | "light";
}
