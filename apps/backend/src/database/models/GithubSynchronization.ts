import { Model } from "../util/model";
import type { JobStatus } from "../util/schemas";
import { jobModelSchema, timestampsSchema } from "../util/schemas";

export class GithubSynchronization extends Model {
  static override tableName = "github_synchronizations";

  static override jsonSchema = {
    allOf: [
      timestampsSchema,
      jobModelSchema,
      {
        type: "object",
        required: ["githubInstallationId"],
        properties: {
          githubInstallationId: { type: "string" },
        },
      },
    ],
  };

  jobStatus!: JobStatus;
  githubInstallationId!: string;
}
