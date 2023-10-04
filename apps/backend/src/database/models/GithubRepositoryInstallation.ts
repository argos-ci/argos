import { Model } from "../util/model.js";
import { mergeSchemas, timestampsSchema } from "../util/schemas.js";

export class GithubRepositoryInstallation extends Model {
  static override tableName = "github_repository_installations";

  static override jsonSchema = mergeSchemas(timestampsSchema, {
    required: ["githubRepositoryId", "githubInstallationId"],
    properties: {
      githubRepositoryId: { type: "string" },
      githubInstallationId: { type: "string" },
    },
  });

  githubRepositoryId!: string;
  githubInstallationId!: string;
}
