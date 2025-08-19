import { z } from "zod";

import { Build, BuildReview } from "../../database/models"; // Added BuildReview

export const AutomationEvents = {
  BuildCompleted: "build.completed",
  BuildReviewed: "build.reviewed",
} as const;

export const AutomationEventSchema = z.enum(AutomationEvents);

export type AutomationEvent = z.infer<typeof AutomationEventSchema>;

type AutomationEventPayload<Event extends AutomationEvent> =
  Event extends "build.completed"
    ? { build: Build }
    : Event extends "build.reviewed"
      ? { build: Build; buildReview: BuildReview }
      : never;

export type AutomationMessage = {
  [E in AutomationEvent]: { event: E; payload: AutomationEventPayload<E> };
}[AutomationEvent];
