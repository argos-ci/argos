import type { Build, Project } from "@/database/models";

export type MergeBaseStrategy<TCtx> = {
  detect: (project: Project) => Promise<boolean> | boolean;
  getContext: (project: Project) => Promise<TCtx | null> | TCtx | null;
  /**
   * Whether we can read the repository commit history (merge base & parent
   * commits) from the provider. The GitHub "light" app has no read access, so
   * it returns `false` and we fall back to a branch-based baseline resolution.
   */
  hasCommitHistoryAccess: (ctx: TCtx) => boolean;
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
