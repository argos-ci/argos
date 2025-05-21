import type { SpendLimitThreshold } from "../database/services/spend-limit";
import type { BuildConclusion, BuildStats, BuildType } from "../database/models/Build.js"; // Assuming these types can be imported

export const WORKFLOW_TYPES = ["welcome", "spend_limit", "build_report"] as const;

export type NotificationWorkflowType = (typeof WORKFLOW_TYPES)[number];

export type NotificationWorkflowData = {
  spend_limit: {
    threshold: SpendLimitThreshold;
    accountName: string | null;
    accountSlug: string;
    blockWhenSpendLimitIsReached: boolean;
  };
  welcome: Record<string, never>;
  build_report: {
    projectId: string;
    buildId: string;
    buildName: string;
    buildUrl: string;
    buildType: BuildType;
    conclusion: BuildConclusion | null; // conclusion can be null initially
    stats: BuildStats;
    projectName: string;
    projectSlug: string; // Or accountSlug
    isReferenceBuild: boolean;
    // Optional commit/branch info if available and useful
    // commitMessage?: string;
    // branchName?: string;
  };
};
