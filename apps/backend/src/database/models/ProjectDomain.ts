import {
  DeploymentEnvironmentSchema,
  ProjectDomainStatusSchema,
  type DeploymentEnvironment,
  type ProjectDomainStatus,
} from "@argos/schemas/deployment";
import type { JSONSchema, RelationMappings } from "objection";

import { Model } from "../util/model";
import { timestampsSchema } from "../util/schemas";
import { Project } from "./Project";

export class ProjectDomain extends Model {
  static override tableName = "project_domains";

  static override jsonSchema = {
    allOf: [
      timestampsSchema,
      {
        type: "object" as const,
        // `status` is deliberately not required: the column is NOT NULL with a
        // default, and the internal-domain paths rely on that default.
        required: ["domain", "environment", "projectId", "internal"],
        properties: {
          domain: { type: "string" },
          environment: DeploymentEnvironmentSchema.toJSONSchema() as JSONSchema,
          branch: { type: ["string", "null"] },
          projectId: { type: "string" },
          internal: { type: "boolean" },
          status: ProjectDomainStatusSchema.toJSONSchema() as JSONSchema,
          cloudfrontTenantId: { type: ["string", "null"] },
          routingEndpoint: { type: ["string", "null"] },
          statusReason: { type: ["string", "null"] },
          activatedAt: { type: ["string", "null"] },
          lastCheckedAt: { type: ["string", "null"] },
        },
      },
    ],
  };

  static override get relationMappings(): RelationMappings {
    return {
      project: {
        relation: Model.BelongsToOneRelation,
        modelClass: Project,
        join: {
          from: "project_domains.projectId",
          to: "projects.id",
        },
      },
    };
  }

  domain!: string;
  environment!: DeploymentEnvironment;
  branch!: string | null;
  projectId!: string;
  internal!: boolean;
  status!: ProjectDomainStatus;
  /** The CloudFront distribution tenant serving this domain. Null when internal. */
  cloudfrontTenantId!: string | null;
  /** The Argos hostname the customer points their DNS record at. */
  routingEndpoint!: string | null;
  statusReason!: string | null;
  activatedAt!: string | null;
  lastCheckedAt!: string | null;

  project?: Project;
}
