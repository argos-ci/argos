import { Build } from "../../database/models";

export enum AutomationEvent {
  BuildCompleted = "build.completed",
  BuildReview = "build.review",
}

export type AutomationEventPayloadMap = {
  [AutomationEvent.BuildCompleted]: Build;
  [AutomationEvent.BuildReview]: Build;
};
