import type { AutomationEvent } from "@argos/schemas/automation-event";

import type { Build, BuildReview, ScreenshotBucket } from "@/database/models";

type AutomationEventPayload<Event extends AutomationEvent> =
  Event extends "build.completed"
    ? { build: Build; compareScreenshotBucket: ScreenshotBucket }
    : Event extends "build.reviewed"
      ? {
          build: Build;
          compareScreenshotBucket: ScreenshotBucket;
          buildReview: BuildReview;
        }
      : never;

export type AutomationMessage = {
  [E in AutomationEvent]: { event: E; payload: AutomationEventPayload<E> };
}[AutomationEvent];
