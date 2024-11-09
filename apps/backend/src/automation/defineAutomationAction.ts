import type { JSONSchema } from "objection";
import type { z } from "zod";

import { AutomationActionRun } from "@/database/models";

export type AutomationActionContext = {
  automationActionRun: AutomationActionRun;
};

export type AutomationAction<TName extends string, TData> = {
  name: TName;
  payloadSchema: z.ZodType<TData>;
  payloadJsonSchema: JSONSchema;
  process: (props: TData & { ctx: AutomationActionContext }) => Promise<void>;
};

export function defineAutomationAction<TName extends string, TData>(
  automationAction: AutomationAction<TName, TData>,
): AutomationAction<TName, TData> {
  return automationAction;
}
