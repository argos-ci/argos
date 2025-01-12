export const WORKFLOW_TYPES = ["welcome", "spend_limit"] as const;

export type NotificationWorkflowType = (typeof WORKFLOW_TYPES)[number];
