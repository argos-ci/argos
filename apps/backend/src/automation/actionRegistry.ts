import { z } from "zod";

import { AutomationActionRun } from "../database/models";

type ActionPayloadSchema = z.ZodTypeAny;
export type ActionPayload = z.infer<ActionPayloadSchema>;

export interface ActionContext {
  automationActionRun: AutomationActionRun;
}

export interface AutomationActionDefinition<
  T extends ActionPayloadSchema = ActionPayloadSchema,
> {
  name: string;
  payloadSchema: T;
  process: (payload: z.infer<T>, context: ActionContext) => Promise<void>;
}

export const actionRegistry = new Map<
  string,
  AutomationActionDefinition<any>
>();

export function registerAction<T extends ActionPayloadSchema>(
  action: AutomationActionDefinition<T>,
): void {
  if (actionRegistry.has(action.name)) {
    throw new Error(`Action name "${action.name}" is already registered.`);
  }
  actionRegistry.set(action.name, action);
}
