import { z } from "zod";

export const PROJECT_EVENTS = [
  "build.completed",
  "build.reviewed",
  "deployment.created",
  "deployment.ready",
] as const;

export const ProjectEventNameSchema = z.enum(PROJECT_EVENTS);

export type ProjectEventName = z.infer<typeof ProjectEventNameSchema>;
