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
import { AutomationEvents, type AutomationMessage } from "./types/events";

function getBuildFromPayload(message: AutomationMessage): Build {
  const { event, payload } = message;
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
  message: AutomationMessage,
): boolean {
  const build = getBuildFromPayload(message);
  return build.type === condition.value;
}

/**
 * Checks if the build conclusion matches the condition.
 */
function checkBuildConclusionCondition(
  condition: BuildConclusionCondition,
  message: AutomationMessage,
): boolean {
  const build = getBuildFromPayload(message);
  return build.conclusion === condition.value;
}

/**
 * Checks if the build name matches the condition.
 */
function checkBuildNameCondition(
  condition: BuildNameCondition,
  message: AutomationMessage,
): boolean {
  const build = getBuildFromPayload(message);
  return build.name === condition.value;
}

/**
 * Evaluates a single automation condition.
 */
function evaluateCondition(
  condition: AutomationCondition,
  message: AutomationMessage,
): boolean {
  AutomationConditionSchema.parse(condition);
  const conditionType = condition.type;

  switch (conditionType) {
    case "build-type": {
      return checkBuildTypeCondition(condition, message);
    }

    case "build-conclusion": {
      return checkBuildConclusionCondition(condition, message);
    }

    case "build-name": {
      return checkBuildNameCondition(condition, message);
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
  message: AutomationMessage,
): boolean {
  if (!allCondition.all.length) {
    return true;
  }
  return (allCondition.all ?? []).every((condition) =>
    evaluateCondition(condition, message),
  );
}

export type TriggerAutomationProps = {
  projectId: string;
  message: AutomationMessage;
};

/**
 * Triggers automation rules for a given project and event.
 */
export async function triggerAutomation(
  args: TriggerAutomationProps,
): Promise<AutomationActionRun[]> {
  const { projectId, message } = args;
  const automationRules = await AutomationRule.query()
    .where("projectId", projectId)
    .where("active", true)
    .whereRaw(`"on" @> ?::jsonb`, [JSON.stringify([message.event])]);

  return transaction(async (trx) => {
    const automationActionRuns = await Promise.all(
      automationRules.map(async (automationRule) => {
        const conditionsMet = evaluateAllCondition(automationRule.if, message);
        if (!conditionsMet) {
          return [];
        }

        const automationRun = await AutomationRun.query(trx).insertAndFetch({
          automationRuleId: automationRule.id,
          event: message.event,
          buildId: "build" in message.payload ? message.payload.build.id : null,
          buildReviewId:
            "buildReview" in message.payload
              ? message.payload.buildReview.id
              : null,
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
