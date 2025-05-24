import { beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";

import {
  actionRegistry,
  AutomationActionDefinition,
  registerAction,
} from "./actionRegistry";

const TestPayloadSchema = z.object({
  message: z.string(),
});

const testAction: AutomationActionDefinition<typeof TestPayloadSchema> = {
  name: "TEST_ACTION",
  payloadSchema: TestPayloadSchema,
  process: async (payload, context) => {
    console.log(`Test action processing: ${payload.message}`, context);
  },
};

describe("Action Registry", () => {
  beforeEach(() => {
    actionRegistry.clear();
  });

  it("should register a new action successfully", () => {
    registerAction(testAction);
    expect(actionRegistry.has("TEST_ACTION")).toBe(true);
    expect(actionRegistry.get("TEST_ACTION")).toBe(testAction);
  });

  it("should throw an error when registering an action type that already exists", () => {
    registerAction(testAction);
    expect(() => registerAction(testAction)).toThrow(
      'Action name "TEST_ACTION" is already registered.',
    );
  });

  it("should allow registering multiple different actions", () => {
    const anotherAction: AutomationActionDefinition<z.ZodNever> = {
      name: "ANOTHER_ACTION",
      payloadSchema: z.never(),
      process: async (payload, context) => {
        console.log("Processing another action", payload, context);
      },
    };
    registerAction(testAction);
    registerAction(anotherAction);
    expect(actionRegistry.has("TEST_ACTION")).toBe(true);
    expect(actionRegistry.has("ANOTHER_ACTION")).toBe(true);
  });
});
