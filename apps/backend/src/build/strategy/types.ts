import type { ArtifactBucket, Build, BuildType } from "@/database/models";

export type GetBaseResult = Promise<{
  baseArtifactBucket: ArtifactBucket | null;
  baseBranch: Build["baseBranch"];
  baseBranchResolvedFrom: Build["baseBranchResolvedFrom"];
}>;

/**
 * Get the base bucket for a build.
 */
export type BuildStrategy<TCtx> = {
  detect: (build: Build) => boolean;
  getContext: (build: Build) => Promise<TCtx | null> | TCtx | null;
  getBase: (build: Build, ctx: TCtx) => GetBaseResult;
  getBuildType: (
    input: {
      baseArtifactBucket: ArtifactBucket | null;
      headArtifactBucket: ArtifactBucket;
    },
    ctx: TCtx,
  ) => BuildType;
};
