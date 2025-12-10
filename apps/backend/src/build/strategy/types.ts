import type { Build, ScreenshotBucket } from "@/database/models";
import type { BuildType } from "@/database/schemas/BuildType";

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
  getBase: (build: Build, ctx: TCtx) => GetBaseResult;
  getBuildType: (
    input: {
      baseScreenshotBucket: ScreenshotBucket | null;
      compareScreenshotBucket: ScreenshotBucket;
    },
    ctx: TCtx,
  ) => BuildType;
};
