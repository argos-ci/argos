import { invariant } from "@argos/util/invariant";
import type { Transaction } from "objection";

import {
  AutomationActionRun,
  AutomationRule,
  AutomationRun,
  Build,
} from "@/database/models";
import logger from "@/logger";

import {
  AllCondition,
  AutomationCondition,
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
    case AutomationEvent.BuildReviewApproved:
    case AutomationEvent.BuildReviewRejected:
      return payload as AutomationEventPayloadMap[AutomationEvent.BuildCompleted];
    default:
      logger.error(
        `[AutomationEngine] Unhandled event type for getBuildFromPayload: ${event}`,
      );
      return null;
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
  if (!build) {
    logger.error(
      `[AutomationEngine] Build not found in payload for BuildTypeCondition`,
      { condition, event },
    );
    return false;
  }
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
  if (!build) {
    logger.error(
      `[AutomationEngine] Build not found in payload for BuildConclusionCondition`,
      { condition, event },
    );
    return false;
  }
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
  invariant("type" in condition, "condition must have a type property");
  if (condition.type === "build-type") {
    return checkBuildTypeCondition(
      condition as BuildTypeCondition,
      event,
      payload,
    );
  }
  if (condition.type === "build-conclusion") {
    return checkBuildConclusionCondition(
      condition as BuildConclusionCondition,
      event,
      payload,
    );
  }
  logger.error(`[AutomationEngine] Unknown condition structure`, { condition });
  return false;
}

/**
 * Evaluates an "all" condition (all sub-conditions must be true).
 */
function evaluateAllCondition(
  allCondition: AllCondition,
  event: AutomationEvent,
  payload: AutomationEventPayloadMap[AutomationEvent],
): boolean {
  if (!allCondition.all || allCondition.all.length === 0) {
    logger.info(
      `[AutomationEngine] No conditions in 'all', evaluating to true.`,
    );
    return true;
  }
  for (const condition of allCondition.all) {
    if (!evaluateCondition(condition, event, payload)) {
      logger.info(`[AutomationEngine] Condition failed`, { condition });
      return false;
    }
  }
  logger.info(`[AutomationEngine] All conditions passed.`);
  return true;
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
  try {
    const rules = await AutomationRule.query(trx)
      .where("projectId", projectId)
      .where("active", true)
      .whereRaw(`"on" @> ?::jsonb`, [JSON.stringify([event])]);

    for (const rule of rules) {
      const conditionsMet = evaluateAllCondition(rule.if, event, payload);

      if (conditionsMet) {
        logger.info(`[AutomationEngine] Conditions met for rule: ${rule.id}`);

        let buildId: string | null = null;

        const associatedBuild = getBuildFromPayload(event, payload);
        if (associatedBuild) {
          buildId = associatedBuild.id;
        }

        const automationRun = await AutomationRun.query(trx).insertAndFetch({
          automationRuleId: rule.id,
          event: event,
          buildId: buildId,
        });
        logger.info(
          `[AutomationEngine] Created AutomationRun: ${automationRun.id} for rule: ${rule.id}`,
        );

        for (const actionDefinition of rule.then) {
          let finalActionPayload;

          switch (actionDefinition.type) {
            case "send_slack_message": {
              const ruleActionPayload = actionDefinition.payload;
              finalActionPayload = {
                channelId: ruleActionPayload.channelId,
              };
              break;
            }

            default: {
              logger.info(
                `[AutomationEngine] Unknown action type: ${actionDefinition.type}`,
                { actionDefinition },
              );
              finalActionPayload = actionDefinition.payload;
            }
          }

          const ActionRun = await AutomationActionRun.query(trx).insertAndFetch(
            {
              jobStatus: "pending",
              conclusion: null,
              failureReason: null,
              automationRunId: automationRun.id,
              action: actionDefinition.type,
              actionPayload: finalActionPayload,
              processedAt: null,
              attempts: 0,
              completedAt: null,
            },
          );
          logger.info(
            `[AutomationEngine] Created ActionRun: ${ActionRun.id} for AutomationRun: ${automationRun.id} with action type ${actionDefinition.type}`,
          );
        }
      }
    }
  } catch (error) {
    console.log(error);
    logger.error("[AutomationEngine] Error in triggerAutomation:", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      projectId,
      event,
    });
  }
}
