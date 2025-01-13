import type { SpendLimitThreshold } from "../database/services/spend-limit";

export const WORKFLOW_TYPES = ["welcome", "spend_limit"] as const;

export type NotificationWorkflowType = (typeof WORKFLOW_TYPES)[number];

export type NotificationWorkflowData = {
  spend_limit: {
    threshold: SpendLimitThreshold;
    accountName: string | null;
    accountSlug: string;
    blockWhenSpendLimitIsReached: boolean;
  };
  welcome: Record<string, never>;
};
