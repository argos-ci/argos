import { z } from 'zod';
import { AutomationActionRun } from '@prisma/client';

// Define ActionPayloadSchema type alias
export type ActionPayloadSchema = z.ZodTypeAny;

// Define ActionContext interface
export interface ActionContext {
  automationActionRun: AutomationActionRun;
  // Add other context properties as needed, e.g., Build, AutomationRun
}

// Define AutomationActionDefinition interface
export interface AutomationActionDefinition<T extends ActionPayloadSchema = ActionPayloadSchema> {
  type: string;
  payloadSchema: T;
  process: (payload: z.infer<T>, context: ActionContext) => Promise<void>;
}

// Implement the actionRegistry
export const actionRegistry = new Map<string, AutomationActionDefinition>();

// Implement the registerAction function
export function registerAction<T extends ActionPayloadSchema>(action: AutomationActionDefinition<T>): void {
  if (actionRegistry.has(action.type)) {
    throw new Error(`Action type "${action.type}" is already registered.`);
  }
  actionRegistry.set(action.type, action as AutomationActionDefinition<ActionPayloadSchema>);
  console.log(`Action registered: ${action.type}`);
}
