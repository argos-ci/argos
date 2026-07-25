import { assertNever } from "@argos/util/assertNever";
import { invariant } from "@argos/util/invariant";

import type { AutomationActionRun } from "@/database/models";
import { UnretryableError } from "@/job-core";

import { type AutomationMessage } from "../types/events";

/**
 * Rebuild the `AutomationMessage` an action run was created for.
 *
 * Shared by every action: the graph to fetch and the per-event payload are a
 * property of the event, not of the destination.
 */
export async function getAutomationMessage(
  actionRun: AutomationActionRun,
): Promise<AutomationMessage> {
  const richActionRun = await actionRun.$fetchGraph(
    "automationRun.[build.compareScreenshotBucket,buildReview]",
  );

  invariant(
    richActionRun,
    "automationRun relation not found",
    UnretryableError,
  );

  invariant(
    richActionRun.automationRun,
    "automationRun relation not found",
    UnretryableError,
  );

  const { automationRun } = richActionRun;

  switch (automationRun.event) {
    case "build.completed": {
      invariant(
        automationRun.build,
        "build relation not found",
        UnretryableError,
      );
      invariant(
        automationRun.build.compareScreenshotBucket,
        "compareScreenshotBucket relation not found",
        UnretryableError,
      );
      return {
        event: automationRun.event,
        payload: {
          build: automationRun.build,
          compareScreenshotBucket: automationRun.build.compareScreenshotBucket,
        },
      };
    }
    case "build.reviewed": {
      invariant(
        automationRun.build,
        "build relation not found",
        UnretryableError,
      );
      invariant(
        automationRun.build.compareScreenshotBucket,
        "compareScreenshotBucket relation not found",
        UnretryableError,
      );
      invariant(
        automationRun.buildReview,
        "buildReview relation not found",
        UnretryableError,
      );
      return {
        event: automationRun.event,
        payload: {
          build: automationRun.build,
          compareScreenshotBucket: automationRun.build.compareScreenshotBucket,
          buildReview: automationRun.buildReview,
        },
      };
    }
    default:
      assertNever(automationRun.event);
  }
}
