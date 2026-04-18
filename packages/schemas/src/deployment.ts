import { z } from "zod";

export const DeploymentEnvironmentSchema = z.enum(["preview", "production"]);

export type DeploymentEnvironment = z.infer<typeof DeploymentEnvironmentSchema>;

export const DeploymentStatusSchema = z.enum(["pending", "ready", "error"]);

export type DeploymentStatus = z.infer<typeof DeploymentStatusSchema>;
