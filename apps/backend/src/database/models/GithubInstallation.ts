import { Model } from "../util/model.js";
import { mergeSchemas, timestampsSchema } from "../util/schemas.js";

export class GithubInstallation extends Model {
  static override tableName = "github_installations";

  static override jsonSchema = mergeSchemas(timestampsSchema, {
    required: ["githubId", "proxy"],
    properties: {
      githubId: { type: "number" },
      deleted: { type: "boolean" },
      githubToken: { type: ["string", "null"] },
      githubTokenExpiresAt: { type: ["string", "null"] },
      app: { type: "string", enum: ["main", "light"] },
      proxy: { type: "boolean" },
    },
  });

  /**
   * The ID of the installation on GitHub.
   */
  githubId!: number;

  /**
   * Whether the installation is deleted.
   */
  deleted!: boolean;

  /**
   * The GitHub token for the installation.
   */
  githubToken!: string | null;

  /**
   * The expiration date of the GitHub token.
   */
  githubTokenExpiresAt!: string | null;

  /**
   * The type of the GitHub app.
   * - `main`: The main GitHub app.
   * - `light`: The app without access to the content permissions.
   */
  app!: "main" | "light";

  /**
   * Whether the installation uses a proxy to call the GitHub API.
   */
  proxy!: boolean;
}
