import { Build } from "../../database/models";

export enum AutomationEvent {
  BuildCompleted = "build.completed",
  BuildReviewApproved = "build.review-approved",
  BuildReviewRejected = "build.review-rejected",
}

export type AutomationEventPayloadMap = {
  [AutomationEvent.BuildCompleted]: Build;
  [AutomationEvent.BuildReviewApproved]: Build;
  [AutomationEvent.BuildReviewRejected]: Build;
};
