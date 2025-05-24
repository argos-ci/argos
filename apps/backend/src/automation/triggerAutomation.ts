import { invariant } from "@argos/util/invariant";
import type { Transaction } from "objection";
import { z } from "zod";

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
import { actionRegistry, ActionPayloadSchema } from "./actionRegistry"; // Import actionRegistry and ActionPayloadSchema

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
        `[AutomationEngine] Unhandled event type for getBuildFromPayload`,
        { eventType: event },
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
      { condition, eventType: event },
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
      { condition, eventType: event },
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
  logger.error(`[AutomationEngine] Unknown condition structure`, { condition, eventType: event });
  return false;
}

/**
 * Evaluates an "all" condition (all sub-conditions must be true).
 */
function evaluateAllCondition(
  allCondition: AllCondition,
  event: AutomationEvent,
  payload: AutomationEventPayloadMap[AutomationEvent],
  ruleContext: Record<string, any>,
): boolean {
  if (!allCondition.all || allCondition.all.length === 0) {
    logger.debug(
      `[AutomationEngine] No conditions in 'all', evaluating to true.`,
      ruleContext,
    );
    return true;
  }
  for (const condition of allCondition.all) {
    if (!evaluateCondition(condition, event, payload)) {
      logger.debug(`[AutomationEngine] Condition failed`, { ...ruleContext, condition });
      return false;
    }
  }
  logger.debug(`[AutomationEngine] All conditions passed.`, ruleContext);
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
      const ruleContext = { projectId, automationRuleId: rule.id, eventType: event };
      const conditionsMet = evaluateAllCondition(rule.if, event, payload, ruleContext);
      // METRIC: automation_rules_evaluated_total, { projectId, eventType: event, ruleId: rule.id, conditionsMet }

      if (conditionsMet) {
        logger.info(`[AutomationEngine] Conditions met for rule`, ruleContext);

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
        // METRIC: automation_runs_created_total, { projectId, eventType: event, ruleId: rule.id }
        logger.info(
          `[AutomationEngine] Created AutomationRun`,
          { ...ruleContext, automationRunId: automationRun.id },
        );

        for (const ruleAction of rule.then) {
          const actionContext = { ...ruleContext, actionType: ruleAction.type };
          const registeredAction = actionRegistry.get(ruleAction.type);

          if (!registeredAction) {
            logger.warn(
              `[AutomationEngine] Action type is not registered. Skipping action.`,
              actionContext,
            );
            continue;
          }

          let validatedPayload;
          try {
            validatedPayload = registeredAction.payloadSchema.parse(ruleAction.payload);
          } catch (validationError) {
            logger.warn(
              `[AutomationEngine] Payload validation failed. Skipping action.`,
              { ...actionContext, error: validationError, originalPayload: ruleAction.payload },
            );
            continue;
          }

          const newActionRun = await AutomationActionRun.query(trx).insertAndFetch({
            jobStatus: "pending",
            conclusion: null,
            failureReason: null,
            automationRunId: automationRun.id,
            action: ruleAction.type,
            actionPayload: validatedPayload,
            processedAt: null,
            attempts: 0,
            completedAt: null,
          });
          // METRIC: automation_action_runs_created_total, { projectId, eventType: event, ruleId: rule.id, actionType: ruleAction.type }
          logger.info(
            `[AutomationEngine] Created AutomationActionRun`,
            { ...actionContext, automationActionRunId: newActionRun.id, automationRunId: automationRun.id },
          );
        }
      }
    }
  } catch (error) {
    logger.error("[AutomationEngine] Error in triggerAutomation", {
      error, // Keep the original error object for Sentry
      projectId,
      eventType: event,
    });
  }
}
