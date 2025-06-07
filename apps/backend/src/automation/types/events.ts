import { Build, BuildReview } from "../../database/models"; // Added BuildReview

export const AutomationEvents = {
  BuildCompleted: "build.completed",
  BuildReviewed: "build.reviewed",
} as const;

export type AutomationEvent =
  (typeof AutomationEvents)[keyof typeof AutomationEvents];

export type AutomationEventPayloadMap = {
  [AutomationEvents.BuildCompleted]: { build: Build };
  [AutomationEvents.BuildReviewed]: { build: Build; buildReview: BuildReview };
};
