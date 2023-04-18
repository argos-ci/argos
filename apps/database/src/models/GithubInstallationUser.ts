import { Model } from "../util/model.js";
import { mergeSchemas, timestampsSchema } from "../util/schemas.js";

export class GithubInstallationUser extends Model {
  static override tableName = "github_installation_users";

  static override jsonSchema = mergeSchemas(timestampsSchema, {
    required: ["githubInstallationId", "githubUserId"],
    properties: {
      githubInstallationId: { type: "string" },
      githubUserId: { type: "string" },
    },
  });

  githubInstallationId!: string;
  githubUserId!: string;
}
