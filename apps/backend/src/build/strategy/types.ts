import type { Build, Screenshot, ScreenshotBucket } from "@/database/models";
import type { BuildType } from "@/database/schemas/BuildType";

export type VirtualScreenshotBucket = {
  screenshots: Screenshot[];
};

export type GetBaseResult = Promise<{
  baseBucket: ScreenshotBucket | VirtualScreenshotBucket | null;
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
      baseBucket: ScreenshotBucket | VirtualScreenshotBucket | null;
      compareScreenshotBucket: ScreenshotBucket;
    },
    ctx: TCtx,
  ) => BuildType;
};
