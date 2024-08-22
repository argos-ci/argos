import type { Project } from "@/database/models/index.js";

export type MergeBaseStrategy<TCtx> = {
  detect: (project: Project) => Promise<boolean> | boolean;
  getContext: (project: Project) => Promise<TCtx | null> | TCtx | null;
  getMergeBaseCommitSha: (args: {
    project: Project;
    ctx: TCtx;
    base: string;
    head: string;
  }) => Promise<string | null>;
  listParentCommitShas: (args: {
    project: Project;
    ctx: TCtx;
    sha: string;
  }) => Promise<string[]>;
};
