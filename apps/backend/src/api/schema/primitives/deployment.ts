import {
  DeploymentEnvironmentSchema,
  DeploymentStatusSchema,
} from "@argos/schemas/deployment";
import { z } from "zod";

import type { Deployment } from "@/database/models";

import { GitBranchSchema } from "./git";
import { Sha256HashSchema } from "./sha";

export const DeploymentSchema = z.object({
  id: z.string(),
  status: DeploymentStatusSchema,
  environment: DeploymentEnvironmentSchema,
  branch: GitBranchSchema,
  commitSha: Sha256HashSchema,
  url: z.url(),
  createdAt: z.string(),
});

export function serializeDeployment(
  deployment: Deployment,
): z.infer<typeof DeploymentSchema> {
  return {
    id: deployment.id,
    branch: deployment.branch,
    commitSha: deployment.commitSha,
    createdAt: deployment.createdAt,
    environment: deployment.environment,
    url: deployment.url,
    status: deployment.status,
  };
}
