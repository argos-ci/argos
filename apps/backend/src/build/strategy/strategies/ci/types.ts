import type { Build, Project } from "@/database/models/index.js";

export type MergeBaseStrategy<TCtx> = {
  detect: (project: Project) => Promise<boolean> | boolean;
  getContext: (project: Project) => Promise<TCtx | null> | TCtx | null;
  getMergeBaseCommitSha: (args: {
    project: Project;
    ctx: TCtx;
    base: string;
    head: string;
    build: Build;
  }) => Promise<string | null>;
  listParentCommitShas: (args: {
    project: Project;
    build: Build;
    ctx: TCtx;
    sha: string;
  }) => Promise<string[]>;
};
