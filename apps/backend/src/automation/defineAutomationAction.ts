import type { z } from "zod";
import type { JSONSchema } from "zod/v4/core";

import type { AutomationActionRun } from "@/database/models/AutomationActionRun";

import type {
  AutomationEvent,
  AutomationEventPayloadMap,
} from "./types/events";

export type AutomationActionContext = {
  automationActionRun: AutomationActionRun;
};

export type AutomationAction<TName extends string, TData> = {
  name: TName;
  payloadSchema: z.ZodType<TData>;
  payloadJsonSchema: JSONSchema.JSONSchema;
  process: (args: {
    payload: TData;
    ctx: AutomationActionContext;
  }) => Promise<void>;
  test: <Event extends AutomationEvent>(args: {
    payload: TData;
    event: Event;
    eventPayload: AutomationEventPayloadMap[Event];
  }) => Promise<void>;
};

export function defineAutomationAction<TName extends string, TData>(
  automationAction: AutomationAction<TName, TData>,
): AutomationAction<TName, TData> {
  return automationAction;
}
