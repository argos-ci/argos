import { describe, it, expect, beforeEach, jest } from 'vitest';
import { z } from 'zod';
import { AutomationActionRun as DbAutomationActionRun } from '@/database/models';
import { AutomationActionRun as PrismaAutomationActionRun } from '@prisma/client';

import { createModelJob, UnretryableError } from '@/job-core';
import { actionRegistry, ActionContext, AutomationActionDefinition, registerAction } from './actionRegistry';
import { automationActionRunJob } from './job'; // This will be the subject of the test
import logger from '@/logger';

// Mock logger
jest.mock('@/logger');

// Mock job-core
jest.mock('@/job-core', () => ({
  ...jest.requireActual('@/job-core'), // Import and retain default behavior
  createModelJob: jest.fn().mockImplementation((name, model, processor) => {
    // Store the processor to call it directly in tests
    mockedProcessor = processor;
    return jest.fn(); // Mocked job function
  }),
}));

let mockedProcessor: (actionRun: DbAutomationActionRun) => Promise<void>;


// Define sample actions for testing
const TestSuccessActionPayloadSchema = z.object({ message: z.string() });
const testSuccessAction: AutomationActionDefinition<typeof TestSuccessActionPayloadSchema> = {
  type: 'TEST_SUCCESS_ACTION',
  payloadSchema: TestSuccessActionPayloadSchema,
  process: jest.fn().mockResolvedValue(undefined),
};

const TestFailureActionPayloadSchema = z.object({ data: z.number() });
const testFailureAction: AutomationActionDefinition<typeof TestFailureActionPayloadSchema> = {
  type: 'TEST_FAILURE_ACTION',
  payloadSchema: TestFailureActionPayloadSchema,
  process: jest.fn().mockRejectedValue(new Error('Action failed intentionally')),
};

const TestUnretryableFailureActionPayloadSchema = z.object({});
const testUnretryableFailureAction: AutomationActionDefinition<typeof TestUnretryableFailureActionPayloadSchema> = {
  type: 'TEST_UNRETRYABLE_FAILURE_ACTION',
  payloadSchema: TestUnretryableFailureActionPayloadSchema,
  process: jest.fn().mockRejectedValue(new UnretryableError('Action failed unretryably')),
};


describe('automationActionRunJob processor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    actionRegistry.clear();

    // Register test actions
    registerAction(testSuccessAction);
    registerAction(testFailureAction);
    registerAction(testUnretryableFailureAction);

    // Ensure createModelJob has been called and processor is captured
    // This requires automationActionRunJob to be initialized, which happens when ./job is imported.
    if (!mockedProcessor) {
        throw new Error("Job processor not captured. Check createModelJob mock.");
    }
  });

  it('should call the correct action processor for a registered action type', async () => {
    const mockActionRun = {
      id: 'actionRun1',
      action: 'TEST_SUCCESS_ACTION',
      actionPayload: { message: 'hello' },
      // Cast to unknown first to satisfy Objection model type, then to Prisma model type for context
    } as unknown as DbAutomationActionRun;

    await mockedProcessor(mockActionRun);

    expect(testSuccessAction.process).toHaveBeenCalledWith(
      { message: 'hello' },
      expect.objectContaining({
        automationActionRun: mockActionRun as unknown as PrismaAutomationActionRun,
      }),
    );
    expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining(`[AutomationJob] Action "TEST_SUCCESS_ACTION" processed successfully for ActionRun ID: actionRun1`)
    );
  });

  it('should throw UnretryableError if action type is not registered', async () => {
    const mockActionRun = {
      id: 'actionRun2',
      action: 'UNREGISTERED_ACTION',
      actionPayload: {},
    } as unknown as DbAutomationActionRun;

    await expect(mockedProcessor(mockActionRun)).rejects.toThrow(UnretryableError);
    await expect(mockedProcessor(mockActionRun)).rejects.toThrow(
      'Unsupported action type: UNREGISTERED_ACTION for AutomationActionRun actionRun2. Action not found in registry.',
    );
    expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining(`[AutomationJob] No action definition found for type "UNREGISTERED_ACTION"`),
        expect.anything()
    );
  });

  it('should throw UnretryableError if payload validation fails', async () => {
    const mockActionRun = {
      id: 'actionRun3',
      action: 'TEST_SUCCESS_ACTION',
      actionPayload: { message: 123 }, // Invalid payload: message should be string
    } as unknown as DbAutomationActionRun;

    await expect(mockedProcessor(mockActionRun)).rejects.toThrow(UnretryableError);
    await expect(mockedProcessor(mockActionRun)).rejects.toThrow(
      expect.stringContaining('Payload validation failed for AutomationActionRun actionRun3'),
    );
     expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining(`[AutomationJob] Payload validation failed for action type "TEST_SUCCESS_ACTION"`),
        expect.anything()
    );
  });

  it('should re-throw error from action processor if it is a regular error', async () => {
    const mockActionRun = {
      id: 'actionRun4',
      action: 'TEST_FAILURE_ACTION',
      actionPayload: { data: 123 },
    } as unknown as DbAutomationActionRun;

    await expect(mockedProcessor(mockActionRun)).rejects.toThrow('Action failed intentionally');
    expect(testFailureAction.process).toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining(`[AutomationJob] Error processing action "TEST_FAILURE_ACTION" for ActionRun ID: actionRun4`),
        expect.objectContaining({ error: expect.any(Error) })
    );
  });
  
  it('should re-throw UnretryableError from action processor', async () => {
    const mockActionRun = {
      id: 'actionRun5',
      action: 'TEST_UNRETRYABLE_FAILURE_ACTION',
      actionPayload: {},
    } as unknown as DbAutomationActionRun;

    await expect(mockedProcessor(mockActionRun)).rejects.toThrow(UnretryableError);
    await expect(mockedProcessor(mockActionRun)).rejects.toThrow('Action failed unretryably');
    expect(testUnretryableFailureAction.process).toHaveBeenCalled();
     expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining(`[AutomationJob] Error processing action "TEST_UNRETRYABLE_FAILURE_ACTION" for ActionRun ID: actionRun5`),
        expect.objectContaining({ error: expect.any(UnretryableError) })
    );
  });
});
