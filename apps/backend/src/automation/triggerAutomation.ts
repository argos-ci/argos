import { assertNever } from "@argos/util/assertNever";
import { invariant } from "@argos/util/invariant";

import { transaction } from "@/database";
import {
  AutomationActionRun,
  AutomationRule,
  AutomationRun,
  Build,
} from "@/database/models";

import { getAutomationAction } from "./actions";
import {
  AllCondition,
  AutomationCondition,
  AutomationConditionSchema,
  BuildConclusionCondition,
  BuildNameCondition,
  BuildTypeCondition,
} from "./types/conditions";
import {
  AutomationEvent,
  AutomationEventPayloadMap,
  AutomationEvents,
} from "./types/events";

function getBuildFromPayload(
  event: AutomationEvent,
  payload: AutomationEventPayloadMap[AutomationEvent],
): Build {
  switch (event) {
    case AutomationEvents.BuildCompleted:
    case AutomationEvents.BuildReviewed: {
      const build = payload.build;
      invariant(
        build,
        `[AutomationEngine] Build not found in payload for event: ${event}`,
      );
      return build;
    }

    default:
      assertNever(
        event,
        `[AutomationEngine] Unsupported event type for build extraction: ${event}`,
      );
  }
}

/**
 * Checks if the build type matches the condition.
 */
function checkBuildTypeCondition(
  condition: BuildTypeCondition,
  event: AutomationEvent,
  payload: AutomationEventPayloadMap[AutomationEvent],
): boolean {
  const build = getBuildFromPayload(event, payload);
  return build.type === condition.value;
}

/**
 * Checks if the build conclusion matches the condition.
 */
function checkBuildConclusionCondition(
  condition: BuildConclusionCondition,
  event: AutomationEvent,
  payload: AutomationEventPayloadMap[AutomationEvent],
): boolean {
  const build = getBuildFromPayload(event, payload);
  return build.conclusion === condition.value;
}

/**
 * Checks if the build name matches the condition.
 */
function checkBuildNameCondition(
  condition: BuildNameCondition, // Type for the specific condition
  event: AutomationEvent,
  payload: AutomationEventPayloadMap[AutomationEvent],
): boolean {
  const build = getBuildFromPayload(event, payload);
  return build.name === condition.value;
}

/**
 * Evaluates a single automation condition.
 */
function evaluateCondition(
  condition: AutomationCondition,
  event: AutomationEvent,
  payload: AutomationEventPayloadMap[AutomationEvent],
): boolean {
  AutomationConditionSchema.parse(condition);
  const conditionType = condition.type;

  switch (conditionType) {
    case "build-type": {
      return checkBuildTypeCondition(condition, event, payload);
    }

    case "build-conclusion": {
      return checkBuildConclusionCondition(condition, event, payload);
    }

    case "build-name": {
      return checkBuildNameCondition(condition, event, payload);
    }

    default: {
      assertNever(conditionType);
    }
  }
}

/**
 * Evaluates an "all" condition (all sub-conditions must be true).
 */
function evaluateAllCondition(
  allCondition: AllCondition,
  event: AutomationEvent,
  payload: AutomationEventPayloadMap[AutomationEvent],
): boolean {
  if (!allCondition.all.length) {
    return true;
  }
  return (allCondition.all ?? []).every((condition) =>
    evaluateCondition(condition, event, payload),
  );
}

export type TriggerAutomationProps<Event extends AutomationEvent> = {
  projectId: string;
  event: Event;
  payload: AutomationEventPayloadMap[Event];
};

/**
 * Triggers automation rules for a given project and event.
 */
export async function triggerAutomation<Event extends AutomationEvent>(
  args: TriggerAutomationProps<Event>,
): Promise<AutomationActionRun[]> {
  const { projectId, event, payload } = args;
  const automationRules = await AutomationRule.query()
    .where("projectId", projectId)
    .where("active", true)
    .whereRaw(`"on" @> ?::jsonb`, [JSON.stringify([event])]);

  return transaction(async (trx) => {
    const automationActionRuns = await Promise.all(
      automationRules.map(async (automationRule) => {
        const conditionsMet = evaluateAllCondition(
          automationRule.if,
          event,
          payload,
        );
        if (!conditionsMet) {
          return [];
        }

        const automationRun = await AutomationRun.query(trx).insertAndFetch({
          automationRuleId: automationRule.id,
          event: event,
          buildId: "build" in payload ? payload.build.id : null,
          buildReviewId:
            "buildReview" in payload ? payload.buildReview.id : null,
          jobStatus: "pending",
        });

        const actionRuns = await AutomationActionRun.query(trx).insertAndFetch(
          automationRule.then.map((ruleAction) => {
            const { action: actionName, actionPayload: payload } = ruleAction;
            const actionDefinition = getAutomationAction(actionName);

            const {
              success: parsingSuccess,
              error: parsingError,
              data: validatedPayload,
            } = actionDefinition.payloadSchema.safeParse(payload);

            invariant(
              parsingSuccess,
              `Invalid payload for action ${actionName}: ${parsingError}`,
            );

            return {
              conclusion: null,
              failureReason: null,
              automationRunId: automationRun.id,
              action: actionName,
              actionPayload: validatedPayload,
              processedAt: null,
              completedAt: null,
              jobStatus: "pending" as const,
            };
          }),
        );

        return actionRuns;
      }),
    );

    return automationActionRuns.flat();
  });
}
