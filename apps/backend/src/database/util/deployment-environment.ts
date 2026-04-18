import type { JSONSchema } from "objection";
import { z } from "zod";

export const DeploymentEnvironmentSchema = z.enum(["preview", "production"]);

export type DeploymentEnvironment = z.infer<typeof DeploymentEnvironmentSchema>;

export const deploymentEnvironmentJsonSchema = z.toJSONSchema(
  DeploymentEnvironmentSchema,
  { io: "input" },
) as JSONSchema;
