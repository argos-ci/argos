import { z } from "zod";

import type { Deployment } from "@/database/models";

export const DeploymentSchema = z.object({
  id: z.string(),
  status: z.enum(["pending", "ready", "error"]),
  environment: z.enum(["preview", "production"]),
  branch: z.string().nullable(),
  commitSha: z.string().nullable(),
  url: z.string().nullable(),
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
