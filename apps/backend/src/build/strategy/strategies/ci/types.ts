import type { Build, Project } from "@/database/models";

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
  /**
   * List `sha` followed by its ancestors, closest first, one page per request
   * to the provider. The caller stops pulling pages once it has what it needs.
   */
  listCommitPages: (args: {
    project: Project;
    build: Build;
    ctx: TCtx;
    sha: string;
  }) => AsyncIterable<string[]>;
};
