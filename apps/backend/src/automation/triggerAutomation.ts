import {
  AutomationConditionSchema,
  type AllAutomationCondition,
  type AutomationBuildCondition,
  type AutomationCondition,
  type BuildBranchCondition,
  type BuildConclusionCondition,
  type BuildModeCondition,
  type BuildNameCondition,
  type BuildTypeCondition,
} from "@argos/schemas/automation-condition";
import { AutomationEvents } from "@argos/schemas/automation-event";
import { assertNever } from "@argos/util/assertNever";
import { invariant } from "@argos/util/invariant";
import { minimatch } from "minimatch";

import { transaction } from "@/database";
import {
  AutomationActionRun,
  AutomationRule,
  AutomationRun,
  type ScreenshotBucket,
} from "@/database/models";

import { getAutomationAction } from "./actions";
import type { AutomationMessage } from "./types/events";

function getBuildFromPayload(message: AutomationMessage) {
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

function getCompareScreenshotBucketFromPayload(
  message: AutomationMessage,
): ScreenshotBucket {
  return message.payload.compareScreenshotBucket;
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
 * Checks if the build mode matches the condition.
 */
function checkBuildModeCondition(
  condition: BuildModeCondition,
  message: AutomationMessage,
): boolean {
  const build = getBuildFromPayload(message);
  return build.mode === condition.value;
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
 * Checks if the build branch matches the condition glob.
 */
function checkBuildBranchCondition(
  condition: BuildBranchCondition,
  message: AutomationMessage,
  options: { glob: boolean },
): boolean {
  const compareScreenshotBucket =
    getCompareScreenshotBucketFromPayload(message);
  return options.glob
    ? minimatch(compareScreenshotBucket.branch, condition.value)
    : compareScreenshotBucket.branch === condition.value;
}

function unwrapCondition(condition: AutomationCondition): {
  glob: boolean;
  negative: boolean;
  rawCondition: AutomationBuildCondition;
} {
  if ("not" in condition) {
    const unwrapped = unwrapCondition(condition.not);
    return { ...unwrapped, negative: !unwrapped.negative };
  }
  if ("glob" in condition) {
    return { glob: true, negative: false, rawCondition: condition.glob };
  }
  return { glob: false, negative: false, rawCondition: condition };
}

/**
 * Evaluates a single automation condition.
 */
function evaluateCondition(
  condition: AutomationCondition,
  message: AutomationMessage,
): boolean {
  AutomationConditionSchema.parse(condition);
  const { glob, negative, rawCondition } = unwrapCondition(condition);

  const conditionType = rawCondition.type;

  const result = (() => {
    switch (conditionType) {
      case "build-branch": {
        return checkBuildBranchCondition(rawCondition, message, { glob });
      }

      case "build-type": {
        return checkBuildTypeCondition(rawCondition, message);
      }

      case "build-conclusion": {
        return checkBuildConclusionCondition(rawCondition, message);
      }

      case "build-mode": {
        return checkBuildModeCondition(rawCondition, message);
      }

      case "build-name": {
        return checkBuildNameCondition(rawCondition, message);
      }

      default: {
        assertNever(conditionType);
      }
    }
  })();

  return negative ? !result : result;
}

/**
 * Evaluates an "all" condition (all sub-conditions must be true).
 */
function evaluateAllCondition(
  allCondition: AllAutomationCondition,
  message: AutomationMessage,
): boolean {
  if (!allCondition.all.length) {
    return true;
  }
  for (const condition of allCondition.all ?? []) {
    const conditionMet = evaluateCondition(condition, message);
    if (!conditionMet) {
      return false;
    }
  }
  return true;
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

  const matchingAutomationRules: AutomationRule[] = [];
  for (const automationRule of automationRules) {
    const conditionsMet = evaluateAllCondition(automationRule.if, message);
    if (conditionsMet) {
      matchingAutomationRules.push(automationRule);
    }
  }

  return transaction(async (trx) => {
    const automationActionRuns = await Promise.all(
      matchingAutomationRules.map(async (automationRule) => {
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
