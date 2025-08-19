import type { z } from "zod";
import type { JSONSchema } from "zod/v4/core";

import type { AutomationActionRun } from "@/database/models/AutomationActionRun";

import type { AutomationMessage } from "./types/events";

type AutomationActionContext = {
  automationActionRun: AutomationActionRun;
};

type TestAutomationArgs<Data> = {
  payload: Data;
  message: AutomationMessage;
};

type ProcessAutomationArgs<Data> = {
  payload: Data;
  ctx: AutomationActionContext;
};

export type AutomationAction<TName extends string, Data> = {
  name: TName;
  payloadSchema: z.ZodType<Data>;
  payloadJsonSchema: JSONSchema.JSONSchema;
  process: (args: ProcessAutomationArgs<Data>) => Promise<void>;
  test: (args: TestAutomationArgs<Data>) => Promise<void>;
};

export function defineAutomationAction<TName extends string, TData>(
  automationAction: AutomationAction<TName, TData>,
): AutomationAction<TName, TData> {
  return automationAction;
}
