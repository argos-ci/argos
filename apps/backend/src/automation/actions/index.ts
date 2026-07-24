import type { AutomationActionType } from "@argos/schemas/automation-action";
import { assertNever } from "@argos/util/assertNever";
import { z } from "zod";

import type { AutomationActionRun } from "@/database/models/AutomationActionRun";

import type { AutomationAction } from "../defineAutomationAction";
import type { AutomationMessage } from "../types/events";
import * as sendMsTeamsMessage from "./sendMsTeamsMessage";
import * as sendSlackMessage from "./sendSlackMessage";

const AUTOMATION_ACTIONS = [
  sendSlackMessage.automationAction,
  sendMsTeamsMessage.automationAction,
] satisfies AutomationAction<string, any>[];

export const AutomationActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal(sendSlackMessage.automationAction.name),
    actionPayload: sendSlackMessage.automationAction.payloadSchema,
  }),
  z.object({
    action: z.literal(sendMsTeamsMessage.automationAction.name),
    actionPayload: sendMsTeamsMessage.automationAction.payloadSchema,
  }),
]);

/**
 * JSON Schema used to validate `AutomationActionRun` rows.
 *
 * It deliberately does *not* use the `oneOf` produced by
 * `z.toJSONSchema(AutomationActionSchema)`.
 *
 * When validating a partial update, Objection strips `required` *recursively*
 * (`AjvValidator.jsonSchemaWithoutRequired` walks `oneOf`/`allOf`/`then`/…).
 * A patch like `{ processedAt }` then matches **every** `oneOf` branch
 * vacuously, and `oneOf` demands exactly one — so it fails. That is why this
 * only broke once a second action existed: with a single branch there was
 * nothing to be ambiguous about.
 *
 * Expressing the payload constraint as `if`/`then` on `action` has no such
 * ambiguity: it still validates fully on insert and stays inert on partial
 * updates. Do not "simplify" it back to `z.toJSONSchema` — that breaks every
 * `AutomationActionRun.patch()` in the job pipeline.
 */
export const AutomatedActionJSONSchema = {
  type: "object",
  properties: {
    action: {
      type: "string",
      enum: AUTOMATION_ACTIONS.map((action) => action.name),
    },
  },
  allOf: AUTOMATION_ACTIONS.map((action) => {
    // `$schema` belongs on the document root, not on an inlined subschema.
    const { $schema: _root, ...actionPayload } = action.payloadJsonSchema;
    return {
      if: {
        type: "object",
        properties: { action: { const: action.name } },
        required: ["action"],
      },
      then: {
        type: "object",
        properties: { actionPayload },
        required: ["actionPayload"],
      },
    };
  }),
};

export type AutomationActionTypeDef = z.infer<typeof AutomationActionSchema>;

type AutomationActionsTypeDef = (typeof AUTOMATION_ACTIONS)[number];

export function getAutomationAction<T extends AutomationActionType>(
  name: T,
): Extract<AutomationActionsTypeDef, { name: T }> {
  const handler = AUTOMATION_ACTIONS.find((action) => action.name === name);
  if (!handler) {
    throw new Error(`AutomationAction not found: ${name}`);
  }
  return handler as Extract<AutomationActionsTypeDef, { name: T }>;
}

/**
 * Run an action for real.
 *
 * Dispatch happens on the discriminated union rather than through
 * `getAutomationAction`: looking the handler up by name widens the payload to
 * the intersection of every action's payload, which no single action satisfies.
 */
export async function processAutomationAction(args: {
  action: AutomationActionTypeDef;
  ctx: { automationActionRun: AutomationActionRun };
}): Promise<void> {
  const { action, ctx } = args;
  switch (action.action) {
    case "sendSlackMessage":
      await sendSlackMessage.automationAction.process({
        payload: action.actionPayload,
        ctx,
      });
      return;
    case "sendMsTeamsMessage":
      await sendMsTeamsMessage.automationAction.process({
        payload: action.actionPayload,
        ctx,
      });
      return;
    default:
      assertNever(action);
  }
}

/**
 * Run an action in test mode, without persisting an action run.
 */
export async function testAutomationAction(args: {
  action: AutomationActionTypeDef;
  message: AutomationMessage;
}): Promise<void> {
  const { action, message } = args;
  switch (action.action) {
    case "sendSlackMessage":
      await sendSlackMessage.automationAction.test({
        payload: action.actionPayload,
        message,
      });
      return;
    case "sendMsTeamsMessage":
      await sendMsTeamsMessage.automationAction.test({
        payload: action.actionPayload,
        message,
      });
      return;
    default:
      assertNever(action);
  }
}
