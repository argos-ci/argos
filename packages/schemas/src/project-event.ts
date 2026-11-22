import { z } from "zod";

export const PROJECT_EVENTS = [
  "build.completed",
  "build.reviewed",
  "deployment.created",
  "deployment.ready",
] as const;

export const ProjectEventNameSchema = z.enum(PROJECT_EVENTS);

export type ProjectEventName = z.infer<typeof ProjectEventNameSchema>;

/**
 * What each event means. Shared with the frontend, so the settings, the API
 * reference and MCP describe events the same way.
 */
export const PROJECT_EVENT_DESCRIPTIONS: Record<ProjectEventName, string> = {
  "build.completed": "A build finishes comparing its screenshots.",
  "build.reviewed": "A build receives a review.",
  "deployment.created": "A deployment starts uploading its files.",
  "deployment.ready": "A deployment is ready to be served.",
};
