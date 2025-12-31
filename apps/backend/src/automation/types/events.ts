import type { AutomationEvent } from "@argos/schemas/automation-event";

import { Build, BuildReview } from "@/database/models";

type AutomationEventPayload<Event extends AutomationEvent> =
  Event extends "build.completed"
    ? { build: Build }
    : Event extends "build.reviewed"
      ? { build: Build; buildReview: BuildReview }
      : never;

export type AutomationMessage = {
  [E in AutomationEvent]: { event: E; payload: AutomationEventPayload<E> };
}[AutomationEvent];
