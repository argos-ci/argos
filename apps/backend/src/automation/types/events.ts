import { z } from "zod";

import { Build, BuildReview } from "../../database/models"; // Added BuildReview

export const AutomationEvents = {
  BuildCompleted: "build.completed",
  BuildReviewed: "build.reviewed",
} as const;

export const AutomationEventSchema = z.nativeEnum(AutomationEvents);

export type AutomationEvent = z.infer<typeof AutomationEventSchema>;

export type AutomationEventPayloadMap = {
  [AutomationEvents.BuildCompleted]: { build: Build };
  [AutomationEvents.BuildReviewed]: { build: Build; buildReview: BuildReview };
};
