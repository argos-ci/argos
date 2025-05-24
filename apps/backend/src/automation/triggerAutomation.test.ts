import { describe, it, expect, beforeEach, jest } from 'vitest';
import { Transaction } from 'objection';
import { z } from 'zod';
import { AutomationRule, AutomationRun, AutomationActionRun as DbAutomationActionRun } from '@/database/models';
import logger from '@/logger';
import { triggerAutomation } from './triggerAutomation';
import { AutomationEvent } from './types/events';
import { actionRegistry, AutomationActionDefinition, ActionContext, registerAction } from './actionRegistry';
import { AutomationActionRun as PrismaAutomationActionRun } from '@prisma/client';

// Mock logger to spy on its methods
jest.mock('@/logger');

// Mock database models
jest.mock('@/database/models', () => ({
  AutomationRule: {
    query: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    whereRaw: jest.fn().mockReturnThis(),
  },
  AutomationRun: {
    query: jest.fn().mockReturnThis(),
    insertAndFetch: jest.fn(),
  },
  AutomationActionRun: {
    query: jest.fn().mockReturnThis(),
    insertAndFetch: jest.fn(),
  },
  Build: jest.fn(), // Assuming Build model might be used internally
}));

// Define a sample payload schema and action for testing
const TestActionPayloadSchema = z.object({
  message: z.string(),
});

const testActionDefinition: AutomationActionDefinition<typeof TestActionPayloadSchema> = {
  type: 'TEST_ACTION',
  payloadSchema: TestActionPayloadSchema,
  process: jest.fn().mockResolvedValue(undefined),
};

const anotherTestActionDefinition: AutomationActionDefinition<z.ZodObject<{ value: z.ZodNumber }>> = {
  type: 'ANOTHER_TEST_ACTION',
  payloadSchema: z.object({ value: z.number() }),
  process: jest.fn().mockResolvedValue(undefined),
};


describe('triggerAutomation', () => {
  let mockTrx: Transaction;

  beforeEach(() => {
    // Reset mocks and actionRegistry before each test
    jest.clearAllMocks();
    actionRegistry.clear();

    // Mock transaction object
    mockTrx = {} as Transaction;

    // Register test actions
    registerAction(testActionDefinition);
    registerAction(anotherTestActionDefinition);

    // Setup default mock implementations
    (AutomationRule.query as jest.Mock).mockImplementation(() => ({
      where: jest.fn().mockReturnThis(),
      whereRaw: jest.fn().mockReturnThis(),
      then: jest.fn().mockImplementation((callback) => callback([])), // Simulates promise resolution
    }));
    (AutomationRun.query as jest.Mock).mockReturnValue({
        insertAndFetch: jest.fn().mockResolvedValue({ id: 'run1' } as AutomationRun),
    });
    (DbAutomationActionRun.query as jest.Mock).mockReturnValue({
        insertAndFetch: jest.fn().mockResolvedValue({ id: 'actionRun1' } as DbAutomationActionRun),
    });
  });

  it('should not create AutomationRun or AutomationActionRun if no rules match', async () => {
    (AutomationRule.query as jest.Mock).mockImplementation(() => ({
        where: jest.fn().mockReturnThis(),
        whereRaw: jest.fn().mockReturnThis(),
        then: jest.fn().mockImplementation(async (callback) => callback([])), // no rules found
    }));

    await triggerAutomation('project1', AutomationEvent.BuildCompleted, {}, mockTrx);

    expect(AutomationRun.query(mockTrx).insertAndFetch).not.toHaveBeenCalled();
    expect(DbAutomationActionRun.query(mockTrx).insertAndFetch).not.toHaveBeenCalled();
  });

  it('should create AutomationRun and AutomationActionRun for a matching rule with valid action payload', async () => {
    const mockRule = {
      id: 'rule1',
      if: { all: [] }, // Conditions met
      then: [{ type: 'TEST_ACTION', payload: { message: 'hello' } }],
      projectId: 'project1',
      active: true,
      on: [AutomationEvent.BuildCompleted],
    } as unknown as AutomationRule;

    (AutomationRule.query as jest.Mock).mockImplementation(() => ({
        where: jest.fn().mockReturnThis(),
        whereRaw: jest.fn().mockReturnThis(),
        then: jest.fn().mockImplementation(async (callback) => callback([mockRule])),
    }));
    
    await triggerAutomation('project1', AutomationEvent.BuildCompleted, {id: 'build1', type: 'ci', conclusion: 'success'} as any, mockTrx);

    expect(AutomationRun.query(mockTrx).insertAndFetch).toHaveBeenCalledWith({
      automationRuleId: 'rule1',
      event: AutomationEvent.BuildCompleted,
      buildId: 'build1',
    });
    expect(DbAutomationActionRun.query(mockTrx).insertAndFetch).toHaveBeenCalledWith(
      expect.objectContaining({
        automationRunId: 'run1',
        action: 'TEST_ACTION',
        actionPayload: { message: 'hello' },
        jobStatus: 'pending',
      }),
    );
  });

  it('should log an error and skip action if payload validation fails', async () => {
    const mockRule = {
      id: 'rule2',
      if: { all: [] }, // Conditions met
      then: [{ type: 'TEST_ACTION', payload: { message: 123 } }], // Invalid payload: message should be string
    } as unknown as AutomationRule;

     (AutomationRule.query as jest.Mock).mockImplementation(() => ({
        where: jest.fn().mockReturnThis(),
        whereRaw: jest.fn().mockReturnThis(),
        then: jest.fn().mockImplementation(async (callback) => callback([mockRule])),
    }));

    await triggerAutomation('project1', AutomationEvent.BuildCompleted, {id: 'build2', type: 'ci', conclusion: 'success'} as any, mockTrx);

    expect(AutomationRun.query(mockTrx).insertAndFetch).toHaveBeenCalled(); // Run is still created
    expect(DbAutomationActionRun.query(mockTrx).insertAndFetch).not.toHaveBeenCalled(); // ActionRun is not created
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('[AutomationEngine] Payload validation failed for action type "TEST_ACTION"'),
      expect.anything(),
    );
  });

  it('should log an error and skip action if action type is not registered', async () => {
    const mockRule = {
      id: 'rule3',
      if: { all: [] }, // Conditions met
      then: [{ type: 'UNREGISTERED_ACTION', payload: {} }],
    } as unknown as AutomationRule;

    (AutomationRule.query as jest.Mock).mockImplementation(() => ({
        where: jest.fn().mockReturnThis(),
        whereRaw: jest.fn().mockReturnThis(),
        then: jest.fn().mockImplementation(async (callback) => callback([mockRule])),
    }));

    await triggerAutomation('project1', AutomationEvent.BuildCompleted, {id: 'build3'} as any, mockTrx);

    expect(AutomationRun.query(mockTrx).insertAndFetch).toHaveBeenCalled();
    expect(DbAutomationActionRun.query(mockTrx).insertAndFetch).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('[AutomationEngine] Action type "UNREGISTERED_ACTION" is not registered.'),
    );
  });
  
  it('should correctly process multiple actions in a single rule', async () => {
    const mockRule = {
      id: 'rule4',
      if: { all: [] },
      then: [
        { type: 'TEST_ACTION', payload: { message: 'action1' } },
        { type: 'ANOTHER_TEST_ACTION', payload: { value: 123 } },
      ],
    } as unknown as AutomationRule;

    (AutomationRule.query as jest.Mock).mockImplementation(() => ({
        where: jest.fn().mockReturnThis(),
        whereRaw: jest.fn().mockReturnThis(),
        then: jest.fn().mockImplementation(async (callback) => callback([mockRule])),
    }));
    (DbAutomationActionRun.query(mockTrx).insertAndFetch as jest.Mock)
        .mockResolvedValueOnce({ id: 'actionRun1' } as DbAutomationActionRun)
        .mockResolvedValueOnce({ id: 'actionRun2' } as DbAutomationActionRun);


    await triggerAutomation('project1', AutomationEvent.BuildCompleted, {id: 'build4'} as any, mockTrx);

    expect(AutomationRun.query(mockTrx).insertAndFetch).toHaveBeenCalledTimes(1);
    expect(DbAutomationActionRun.query(mockTrx).insertAndFetch).toHaveBeenCalledTimes(2);
    expect(DbAutomationActionRun.query(mockTrx).insertAndFetch).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'TEST_ACTION', actionPayload: { message: 'action1' } })
    );
    expect(DbAutomationActionRun.query(mockTrx).insertAndFetch).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'ANOTHER_TEST_ACTION', actionPayload: { value: 123 } })
    );
  });

});
