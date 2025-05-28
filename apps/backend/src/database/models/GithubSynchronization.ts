import { Model } from "../util/model.js";
import type { JobStatus } from "../util/schemas.js";
import {
  jobModelSchema,
  mergeSchemas,
  timestampsSchema,
} from "../util/schemas.js";

export class GithubSynchronization extends Model {
  static override tableName = "github_synchronizations";

  static override jsonSchema = mergeSchemas(timestampsSchema, jobModelSchema, {
    required: ["githubInstallationId"],
    properties: {
      githubInstallationId: { type: "string" },
    },
  });

  jobStatus!: JobStatus;
  githubInstallationId!: string;
}
