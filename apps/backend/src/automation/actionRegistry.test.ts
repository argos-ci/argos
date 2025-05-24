import { describe, it, expect, beforeEach } from 'vitest';
import { z } from 'zod';
import {
  actionRegistry,
  registerAction,
  ActionPayloadSchema,
  ActionContext,
  AutomationActionDefinition,
} from './actionRegistry';
import { AutomationActionRun } from '@prisma/client';

// Mock ActionContext for testing
const mockActionContext: ActionContext = {
  automationActionRun: {} as AutomationActionRun, // Minimal mock
};

// Define a sample payload schema for testing
const TestPayloadSchema = z.object({
  message: z.string(),
});

// Define a sample action for testing
const testAction: AutomationActionDefinition<typeof TestPayloadSchema> = {
  type: 'TEST_ACTION',
  payloadSchema: TestPayloadSchema,
  process: async (payload, context) => {
    console.log(`Test action processing: ${payload.message}`, context);
  },
};

describe('Action Registry', () => {
  beforeEach(() => {
    // Clear the registry before each test
    actionRegistry.clear();
  });

  it('should register a new action successfully', () => {
    registerAction(testAction);
    expect(actionRegistry.has('TEST_ACTION')).toBe(true);
    expect(actionRegistry.get('TEST_ACTION')).toBe(testAction);
  });

  it('should throw an error when registering an action type that already exists', () => {
    registerAction(testAction);
    expect(() => registerAction(testAction)).toThrow(
      'Action type "TEST_ACTION" is already registered.',
    );
  });

  it('should allow registering multiple different actions', () => {
    const anotherAction: AutomationActionDefinition<z.ZodNever> = {
      type: 'ANOTHER_ACTION',
      payloadSchema: z.never(),
      process: async (payload, context) => { console.log("Processing another action", payload, context)},
    };
    registerAction(testAction);
    registerAction(anotherAction);
    expect(actionRegistry.has('TEST_ACTION')).toBe(true);
    expect(actionRegistry.has('ANOTHER_ACTION')).toBe(true);
  });
});
