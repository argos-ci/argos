import type { Build, BuildType, ScreenshotBucket } from "@/database/models";

export type GetBaseResult = Promise<{
  baseScreenshotBucket: ScreenshotBucket | null;
  baseBranch: Build["baseBranch"];
  baseBranchResolvedFrom: Build["baseBranchResolvedFrom"];
}>;

/**
 * Get the base bucket for a build.
 */
export type BuildStrategy<TCtx> = {
  detect: (build: Build) => boolean;
  getContext: (build: Build) => Promise<TCtx | null> | TCtx | null;
  getBase: (build: Build) => GetBaseResult;
  getBuildType: (
    input: {
      baseScreenshotBucket: ScreenshotBucket | null;
      compareScreenshotBucket: ScreenshotBucket;
    },
    ctx: TCtx,
  ) => BuildType;
};
