import { z } from "zod";

export const AutomationEvents = {
  BuildCompleted: "build.completed",
  BuildReviewed: "build.reviewed",
} as const;

export const AutomationEventSchema = z.enum(AutomationEvents);

export type AutomationEvent = z.infer<typeof AutomationEventSchema>;
