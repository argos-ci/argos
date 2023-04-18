import { Model } from "../util/model.js";
import { mergeSchemas, timestampsSchema } from "../util/schemas.js";

export class GithubOrganization extends Model {
  static override tableName = "github_organizations";

  static override jsonSchema = mergeSchemas(timestampsSchema, {
    required: ["login", "githubId"],
    properties: {
      name: { type: ["string", "null"] },
      login: { type: "string" },
      githubId: { type: "number" },
    },
  });

  name!: string | null;
  login!: string;
  githubId!: number;
}
