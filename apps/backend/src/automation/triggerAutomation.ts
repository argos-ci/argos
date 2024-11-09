import { assertNever } from "@argos/util/assertNever";
import { invariant } from "@argos/util/invariant";
import type { Transaction } from "objection";

import {
  AutomationActionRun,
  AutomationRule,
  AutomationRun,
  Build,
} from "@/database/models";

import { actionRegistry } from "./actionRegistry";
import {
  AllCondition,
  AutomationCondition,
  AutomationConditionSchema,
  BuildConclusionCondition,
  BuildTypeCondition,
} from "./types/conditions";
import { AutomationEvent, AutomationEventPayloadMap } from "./types/events";

function getBuildFromPayload(
  event: AutomationEvent,
  payload: AutomationEventPayloadMap[AutomationEvent],
): Build | null {
  switch (event) {
    case AutomationEvent.BuildCompleted:
    case AutomationEvent.BuildReview:
      return payload;
    default:
      throw new Error(
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
  invariant(
    build,
    `[AutomationEngine] Build not found in payload for BuildTypeCondition`,
  );
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
  invariant(
    build,
    `[AutomationEngine] Build not found in payload for BuildConclusionCondition`,
  );
  return build.conclusion === condition.value;
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
  return (allCondition.all ?? []).every((condition) =>
    evaluateCondition(condition, event, payload),
  );
}

/**
 * Triggers automation rules for a given project and event.
 */
export async function triggerAutomation<Event extends AutomationEvent>(
  projectId: string,
  event: Event,
  payload: AutomationEventPayloadMap[Event],
  trx?: Transaction,
): Promise<void> {
  const rules = await AutomationRule.query(trx)
    .where("projectId", projectId)
    .where("active", true)
    .whereRaw(`"on" @> ?::jsonb`, [JSON.stringify([event])]);

  for (const rule of rules) {
    const conditionsMet = evaluateAllCondition(rule.if, event, payload);

    if (conditionsMet) {
      const build = getBuildFromPayload(event, payload);
      invariant(
        build,
        `[AutomationEngine] Build not found in payload for event: ${event}`,
      );

      const automationRun = await AutomationRun.query(trx).insertAndFetch({
        automationRuleId: rule.id,
        event: event,
        buildId: build.id,
      });

      for (const ruleAction of rule.then) {
        const actionDefinition = actionRegistry.get(ruleAction.type);

        invariant(
          actionDefinition,
          `[AutomationEngine] Unsupported action type: ${ruleAction.type}. Action not found in registry.`,
        );

        const {
          success: parsingSuccess,
          error: parsingError,
          data: validatedPayload,
        } = actionDefinition.payloadSchema.safeParse(ruleAction.payload);

        invariant(
          parsingSuccess,
          `Invalid payload for action ${ruleAction.type}: ${parsingError}`,
        );

        await AutomationActionRun.query(trx).insertAndFetch({
          jobStatus: "pending",
          conclusion: null,
          failureReason: null,
          automationRunId: automationRun.id,
          action: ruleAction.type,
          actionPayload: validatedPayload,
          processedAt: null,
          completedAt: null,
        });
      }
    }
  }
}
